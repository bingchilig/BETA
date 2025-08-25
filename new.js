// new.js - 수행평가와 D-Day 서버 동기화
// 기존 코드에 영향 없이 추가할 수 있는 독립적인 모듈

// 새로운 구글 시트 API URL (새로 만들 예정)
const NEW_API_URL = 'https://script.google.com/macros/s/AKfycbx9JLg72mV9RdJYUOfPqnWdkMbBH7bvxFxVVg411V-fqBRJQeloFxZ_GSdk6d7i0hiL/exec';
const SYNC_INTERVAL_NEW = 30000; // 30초마다 동기화
const API_TIMEOUT_NEW = 10000; // 10초 타임아웃

// 전역 변수
let serverDdayList = [];
let serverAssessmentList = [];
let isNewApiConnected = false;
let lastNewApiSync = 0;
let newApiUpdateQueue = [];
let isNewApiUpdating = false;

// 새로운 API용 타임아웃 fetch
function fetchNewApiWithTimeout(url, options = {}) {
    return new Promise((resolve, reject) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            controller.abort();
            reject(new Error('새 API 요청 시간 초과'));
        }, API_TIMEOUT_NEW);

        fetch(url, { ...options, signal: controller.signal })
            .then(response => {
                clearTimeout(timeoutId);
                resolve(response);
            })
            .catch(error => {
                clearTimeout(timeoutId);
                reject(error);
            });
    });
}

// 서버에서 D-Day 데이터 가져오기
async function fetchDdayFromServer() {
    try {
        const response = await fetchNewApiWithTimeout(`${NEW_API_URL}?action=getDday&t=${Date.now()}`);
        if (!response.ok) throw new Error('D-Day 데이터 가져오기 실패');
        
        const result = await response.json();
        if (!result.success) throw new Error(result.error || 'D-Day 서버 오류');
        
        return result.data || [];
    } catch (error) {
        console.error('D-Day 가져오기 오류:', error);
        return [];
    }
}

// 서버에서 수행평가 데이터 가져오기
async function fetchAssessmentFromServer() {
    try {
        const response = await fetchNewApiWithTimeout(`${NEW_API_URL}?action=getAssessment&t=${Date.now()}`);
        if (!response.ok) throw new Error('수행평가 데이터 가져오기 실패');
        
        const result = await response.json();
        if (!result.success) throw new Error(result.error || '수행평가 서버 오류');
        
        return result.data || [];
    } catch (error) {
        console.error('수행평가 가져오기 오류:', error);
        return [];
    }
}

// 서버에 D-Day 데이터 추가
async function addDdayToServer(title, date) {
    try {
        const response = await fetchNewApiWithTimeout(`${NEW_API_URL}?action=addDday&title=${encodeURIComponent(title)}&date=${encodeURIComponent(date)}`);
        if (!response.ok) throw new Error('D-Day 추가 실패');
        
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('D-Day 추가 오류:', error);
        return { success: false, error: error.message };
    }
}

// 서버에 수행평가 데이터 추가
async function addAssessmentToServer(subject, date) {
    try {
        const response = await fetchNewApiWithTimeout(`${NEW_API_URL}?action=addAssessment&subject=${encodeURIComponent(subject)}&date=${encodeURIComponent(date)}`);
        if (!response.ok) throw new Error('수행평가 추가 실패');
        
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('수행평가 추가 오류:', error);
        return { success: false, error: error.message };
    }
}

// 서버에서 D-Day 데이터 삭제
async function deleteDdayFromServer(id) {
    try {
        const response = await fetchNewApiWithTimeout(`${NEW_API_URL}?action=deleteDday&id=${id}`);
        if (!response.ok) throw new Error('D-Day 삭제 실패');
        
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('D-Day 삭제 오류:', error);
        return { success: false, error: error.message };
    }
}

// 서버에서 수행평가 데이터 삭제
async function deleteAssessmentFromServer(id) {
    try {
        const response = await fetchNewApiWithTimeout(`${NEW_API_URL}?action=deleteAssessment&id=${id}`);
        if (!response.ok) throw new Error('수행평가 삭제 실패');
        
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('수행평가 삭제 오류:', error);
        return { success: false, error: error.message };
    }
}

// 서버 데이터와 로컬 데이터 동기화
async function syncWithNewServer() {
    const now = Date.now();
    if (now - lastNewApiSync < 10000) return; // 최소 10초 간격
    
    try {
        console.log('새 서버와 동기화 시작...');
        
        // 서버에서 데이터 가져오기
        const [serverDday, serverAssessment] = await Promise.all([
            fetchDdayFromServer(),
            fetchAssessmentFromServer()
        ]);
        
        // 데이터 업데이트 확인
        let ddayChanged = false;
        let assessmentChanged = false;
        
        // D-Day 데이터 비교
        if (JSON.stringify(serverDdayList) !== JSON.stringify(serverDday)) {
            serverDdayList = serverDday;
            ddayChanged = true;
        }
        
        // 수행평가 데이터 비교
        if (JSON.stringify(serverAssessmentList) !== JSON.stringify(serverAssessment)) {
            serverAssessmentList = serverAssessment;
            assessmentChanged = true;
        }
        
        // UI 업데이트
        if (ddayChanged) {
            updateDdayDisplayFromServer();
        }
        if (assessmentChanged) {
            updateAssessmentDisplayFromServer();
        }
        
        isNewApiConnected = true;
        lastNewApiSync = now;
        
        // 연결 상태 표시 업데이트
        updateNewApiConnectionStatus('connected');
        
        console.log('새 서버 동기화 완료');
        
    } catch (error) {
        console.error('새 서버 동기화 오류:', error);
        isNewApiConnected = false;
        updateNewApiConnectionStatus('error');
    }
}

// 새 API 연결 상태 표시
function updateNewApiConnectionStatus(status) {
    // 기존 topbar에 새로운 상태 표시 추가
    const topbar = document.querySelector('.topbar');
    if (!topbar) return;
    
    let statusIndicator = document.getElementById('newApiStatus');
    if (!statusIndicator) {
        statusIndicator = document.createElement('div');
        statusIndicator.id = 'newApiStatus';
        statusIndicator.style.cssText = `
            position: absolute;
            top: 5px;
            right: 5px;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            transition: background-color 0.3s;
        `;
        topbar.appendChild(statusIndicator);
    }
    
    switch(status) {
        case 'connected':
            statusIndicator.style.backgroundColor = '#10b981';
            statusIndicator.title = '서버 연결됨';
            break;
        case 'connecting':
            statusIndicator.style.backgroundColor = '#fbbf24';
            statusIndicator.title = '서버 연결 중...';
            break;
        case 'error':
            statusIndicator.style.backgroundColor = '#ef4444';
            statusIndicator.title = '서버 연결 오류';
            break;
    }
}

// 서버 데이터로 D-Day 디스플레이 업데이트
function updateDdayDisplayFromServer() {
    const ddayContainer = document.getElementById('ddayContainer');
    if (!ddayContainer) return;
    
    ddayContainer.innerHTML = '';
    const today = new Date();
    
    serverDdayList.forEach(item => {
        const targetDate = new Date(item.date);
        const diffTime = targetDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        let ddayText = '';
        let ddayClass = '';
        
        if (diffDays === 0) {
            ddayText = 'D-DAY';
            ddayClass = 'today';
        } else if (diffDays > 0) {
            ddayText = `D-${diffDays}`;
        } else {
            ddayText = `D+${Math.abs(diffDays)}`;
        }
        
        const ddayEl = document.createElement('div');
        ddayEl.className = 'dday-item';
        ddayEl.innerHTML = `
            <div class="dday-info">
                <div class="dday-title">${item.title}</div>
                <div class="dday-date">${new Date(item.date).toLocaleDateString('ko-KR')}</div>
            </div>
            <div class="dday-counter ${ddayClass}">${ddayText}</div>
            <button class="delete-btn" onclick="deleteServerDday('${item.id}')">삭제</button>
        `;
        ddayContainer.appendChild(ddayEl);
    });
}

// 서버 데이터로 수행평가 디스플레이 업데이트
function updateAssessmentDisplayFromServer() {
    const assessmentContainer = document.getElementById('assessmentContainer');
    if (!assessmentContainer) return;
    
    assessmentContainer.innerHTML = '';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // 날짜순 정렬
    serverAssessmentList.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    serverAssessmentList.forEach(item => {
        const assessmentDate = new Date(item.date);
        assessmentDate.setHours(0, 0, 0, 0);
        
        const diffTime = assessmentDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        let status = '';
        let statusClass = '';
        
        if (diffDays === 0) {
            status = '오늘';
            statusClass = 'today';
        } else if (diffDays > 0) {
            status = `${diffDays}일 후`;
            statusClass = 'upcoming';
        } else {
            status = '완료';
            statusClass = 'completed';
        }
        
        const assessmentEl = document.createElement('div');
        assessmentEl.className = 'assessment-item';
        assessmentEl.innerHTML = `
            <div class="assessment-info">
                <div class="assessment-subject">${item.subject}</div>
                <div class="assessment-date">${new Date(item.date).toLocaleDateString('ko-KR')}</div>
            </div>
            <div class="assessment-status ${statusClass}">${status}</div>
            <button class="delete-btn" onclick="deleteServerAssessment('${item.id}')">삭제</button>
        `;
        assessmentContainer.appendChild(assessmentEl);
    });
}

// 서버에 새 D-Day 추가하는 함수 (전역 스코프)
async function addServerDday() {
    const title = document.getElementById('ddayTitle').value.trim();
    const date = document.getElementById('ddayDate').value;
    
    if (!title || !date) {
        alert('모든 필드를 입력해주세요.');
        return;
    }
    
    updateNewApiConnectionStatus('connecting');
    
    try {
        const result = await addDdayToServer(title, date);
        
        if (result.success) {
            // 성공 시 즉시 동기화
            await syncWithNewServer();
            closeServerDdayModal();
            
        } else {
            throw new Error(result.error || '서버 추가 실패');
        }
        
    } catch (error) {
        console.error('D-Day 추가 오류:', error);
        alert(`D-Day 추가 중 오류가 발생했습니다: ${error.message}`);
        updateNewApiConnectionStatus('error');
    }
}

// 서버에서 D-Day 삭제하는 함수 (전역 스코프)
async function deleteServerDday(id) {
    if (!confirm('이 D-Day를 삭제하시겠습니까?')) return;
    
    updateNewApiConnectionStatus('connecting');
    
    try {
        const result = await deleteDdayFromServer(id);
        
        if (result.success) {
            // 성공 시 즉시 동기화
            await syncWithNewServer();
            alert('D-Day가 삭제되었습니다!');
        } else {
            throw new Error(result.error || '서버 삭제 실패');
        }
        
    } catch (error) {
        console.error('D-Day 삭제 오류:', error);
        alert(`D-Day 삭제 중 오류가 발생했습니다: ${error.message}`);
        updateNewApiConnectionStatus('error');
    }
}

// 서버에 새 수행평가 추가하는 함수 (전역 스코프)
async function addServerAssessment() {
    const subject = document.getElementById('assessmentSubject').value.trim();
    const date = document.getElementById('assessmentDate').value;
    if (!subject || !date) { alert('모든 필드를 입력해주세요.'); return; }

    updateNewApiConnectionStatus('connecting');

    try {
        const result = await addAssessmentToServer(subject, date);
        if (result && result.success) {
        await syncWithNewServer();
        closeServerAssessmentModal();
        alert('수행평가가 추가되었습니다!');
        updateNewApiConnectionStatus('connected');
        return;
        }
        throw new Error(result?.error || '서버 추가 실패');
    } catch (error) {
        console.warn('[서버 실패 → 로컬 저장 fallback]', error.message);

        // ✅ 자동 로컬 저장 fallback
        if (typeof window.addAssessment === 'function') {
        // 로컬 리스트에 직접 push
        window.assessmentList = JSON.parse(localStorage.getItem('assessmentList') || '[]');
        window.assessmentList.push({ subject, date, id: Date.now() });
        localStorage.setItem('assessmentList', JSON.stringify(window.assessmentList));
        if (typeof window.updateAssessmentDisplay === 'function') {
            window.updateAssessmentDisplay();
        }
        closeServerAssessmentModal();
        alert('서버 연결 문제로 로컬에 저장했습니다.');
        } else {
        alert(`수행평가 추가 실패: ${error.message}`);
        }
        updateNewApiConnectionStatus('error');
    }
}


// 서버에서 수행평가 삭제하는 함수 (전역 스코프)
async function deleteServerAssessment(id) {
    if (!confirm('이 수행평가를 삭제하시겠습니까?')) return;
    
    updateNewApiConnectionStatus('connecting');
    
    try {
        const result = await deleteAssessmentFromServer(id);
        
        if (result.success) {
            // 성공 시 즉시 동기화
            await syncWithNewServer();
            alert('수행평가가 삭제되었습니다!');
        } else {
            throw new Error(result.error || '서버 삭제 실패');
        }
        
    } catch (error) {
        console.error('수행평가 삭제 오류:', error);
        alert(`수행평가 삭제 중 오류가 발생했습니다: ${error.message}`);
        updateNewApiConnectionStatus('error');
    }
}

// 서버 모달 관련 함수들
function openServerDdayModal() {
    document.getElementById('ddayModal').classList.add('visible');
    document.getElementById('ddayTitle').focus();
    
    // 기존 버튼을 서버 버튼으로 교체
    const addButton = document.querySelector('#ddayModal .modal-btn.primary');
    if (addButton) {
        addButton.onclick = addServerDday;
        addButton.textContent = 'D-DAY 추가';
    }
}

function closeServerDdayModal() {
    document.getElementById('ddayModal').classList.remove('visible');
    document.getElementById('ddayTitle').value = '';
    document.getElementById('ddayDate').value = '';
    document.getElementById('ddayKeyboard').classList.remove('visible');
    
    // 버튼을 원래대로 복구
    const addButton = document.querySelector('#ddayModal .modal-btn.primary');
    if (addButton) {
        addButton.onclick = addDday; // 원래 함수로 복구
        addButton.textContent = '추가';
    }
}

function openServerAssessmentModal() {
    document.getElementById('assessmentModal').classList.add('visible');
    document.getElementById('assessmentSubject').focus();

    const addButton = document.querySelector('#assessmentModal .modal-btn.primary');
    if (addButton) {
        addButton.removeAttribute('onclick');      // ✅ inline 핸들러 제거
        addButton.onclick = addServerAssessment;   // JS 핸들러만 사용
        addButton.textContent = '수행평가 추가';
    }
}

function closeServerAssessmentModal() {
    document.getElementById('assessmentModal').classList.remove('visible');
    document.getElementById('assessmentSubject').value = '';
    document.getElementById('assessmentDate').value = '';
    document.getElementById('assessmentKeyboard').classList.remove('visible');
    
    // 버튼을 원래대로 복구
    const addButton = document.querySelector('#assessmentModal .modal-btn.primary');
    if (addButton) {
        addButton.onclick = addAssessment; // 원래 함수로 복구
        addButton.textContent = '추가';
    }
}

// 기존 함수들을 서버 버전으로 교체하는 함수
function enableServerMode() {
    // D-Day 추가 버튼 이벤트 변경
    const ddayAddBtn = document.querySelector('.add-btn[onclick="openDdayModal()"]');
    if (ddayAddBtn) {
        ddayAddBtn.setAttribute('onclick', 'openServerDdayModal()');
        ddayAddBtn.innerHTML = '+ 서버에 추가';
    }
    
    // 수행평가 추가 버튼 이벤트 변경
    const assessmentAddBtn = document.querySelector('.add-btn[onclick="openAssessmentModal()"]');
    if (assessmentAddBtn) {
        assessmentAddBtn.setAttribute('onclick', 'openServerAssessmentModal()');
        assessmentAddBtn.innerHTML = '+ 서버에 추가';
    }
    
    console.log('서버 모드가 활성화되었습니다.');
}

// 로컬 모드로 되돌리는 함수
function enableLocalMode() {
    // D-Day 추가 버튼 이벤트 변경
    const ddayAddBtn = document.querySelector('.add-btn');
    if (ddayAddBtn && ddayAddBtn.getAttribute('onclick') === 'openServerDdayModal()') {
        ddayAddBtn.setAttribute('onclick', 'openDdayModal()');
        ddayAddBtn.innerHTML = '+ 추가';
    }
    
    // 수행평가 추가 버튼 이벤트 변경
    const assessmentAddBtn = document.querySelectorAll('.add-btn')[1];
    if (assessmentAddBtn && assessmentAddBtn.getAttribute('onclick') === 'openServerAssessmentModal()') {
        assessmentAddBtn.setAttribute('onclick', 'openAssessmentModal()');
        assessmentAddBtn.innerHTML = '+ 추가';
    }
    
    console.log('로컬 모드가 활성화되었습니다.');
}

// 초기화 함수 (연결 테스트 기반)
async function initializeNewApi() {
    console.log('새 API 초기화 중...');
    updateNewApiConnectionStatus('connecting');

    const ok = await testNewApiConnection(); // ✅ 연결 확인
    if (ok) {
        enableServerMode();
        await syncWithNewServer();             // 첫 동기화
        // 주기 동기화
        setInterval(() => {
        if (!isNewApiUpdating) syncWithNewServer();
        }, SYNC_INTERVAL_NEW);

        // 탭 복귀 시 동기화
        document.addEventListener('visibilitychange', () => {
        if (!document.hidden) syncWithNewServer();
        });

        updateNewApiConnectionStatus('connected');
        console.log('새 API 초기화 완료(서버 모드)');
    } else {
        enableLocalMode();                     // ✅ 서버 안되면 로컬로
        updateNewApiConnectionStatus('error');
        console.log('새 API 연결 실패 → 로컬 모드로 전환');
    }
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => { initializeNewApi(); }, 1000);
});

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    // 잠시 후에 초기화 (기존 코드 로드 후)
    setTimeout(() => {
        initializeNewApi();
    }, 1000);
});

// 수동 동기화 함수 (디버깅용)
function manualSync() {
    console.log('수동 동기화 실행...');
    syncWithNewServer();
}

// 연결 테스트 함수
async function testNewApiConnection() {
    console.log('새 API 연결 테스트 중...');
    updateNewApiConnectionStatus('connecting');
    
    try {
        const response = await fetchNewApiWithTimeout(`${NEW_API_URL}?action=test`);
        const result = await response.json();
        
        if (result.success) {
            console.log('새 API 연결 성공!');
            updateNewApiConnectionStatus('connected');
            return true;
        } else {
            throw new Error(result.error || '연결 테스트 실패');
        }
    } catch (error) {
        console.error('새 API 연결 실패:', error);
        updateNewApiConnectionStatus('error');
        return false;
    }
}
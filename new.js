// new.js - 수행평가와 D-Day 서버 동기화 (개선된 버전)
// 기존 코드에 영향 없이 추가할 수 있는 독립적인 모듈

// 새로운 구글 시트 API URL
const NEW_API_URL = 'https://script.google.com/macros/s/AKfycbx9JLg72mV9RdJYUOfPqnWdkMbBH7bvxFxVVg411V-fqBRJQeloFxZ_GSdk6d7i0hiL/exec';
const SYNC_INTERVAL_NEW = 20000; // 20초마다 동기화 (최적화)
const API_TIMEOUT_NEW = 8000; // 8초 타임아웃 (최적화)

// 전역 변수
let serverDdayList = [];
let serverAssessmentList = [];
let isNewApiConnected = false;
let lastNewApiSync = 0;
let newApiUpdateQueue = [];
let isNewApiUpdating = false;

// 요청 캐시 및 중복 방지
let requestCache = new Map();
let pendingRequests = new Set();

// 새로운 API용 타임아웃 fetch (최적화된 버전)
function fetchNewApiWithTimeout(url, options = {}) {
    // 중복 요청 방지
    const requestKey = url + JSON.stringify(options);
    if (pendingRequests.has(requestKey)) {
        return Promise.reject(new Error('중복 요청 방지'));
    }
    
    pendingRequests.add(requestKey);
    
    return new Promise((resolve, reject) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            controller.abort();
            pendingRequests.delete(requestKey);
            reject(new Error('새 API 요청 시간 초과'));
        }, API_TIMEOUT_NEW);

        fetch(url, { 
            ...options, 
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
                ...options.headers
            }
        })
        .then(response => {
            clearTimeout(timeoutId);
            pendingRequests.delete(requestKey);
            resolve(response);
        })
        .catch(error => {
            clearTimeout(timeoutId);
            pendingRequests.delete(requestKey);
            reject(error);
        });
    });
}

// 배치 요청 처리 (최적화)
async function batchRequest(requests) {
    const results = await Promise.allSettled(requests);
    return results.map(result => 
        result.status === 'fulfilled' ? result.value : null
    );
}

// 서버에서 D-Day 데이터 가져오기 (캐시 적용)
async function fetchDdayFromServer() {
    const cacheKey = 'dday_data';
    const now = Date.now();
    
    if (requestCache.has(cacheKey) && 
        now - requestCache.get(cacheKey).timestamp < 5000) {
        return requestCache.get(cacheKey).data;
    }
    
    try {
        const response = await fetchNewApiWithTimeout(
            `${NEW_API_URL}?action=getDday&t=${now}&cache=${Math.random()}`
        );
        if (!response.ok) throw new Error('D-Day 데이터 가져오기 실패');
        
        const result = await response.json();
        if (!result.success) throw new Error(result.error || 'D-Day 서버 오류');
        
        const data = result.data || [];
        requestCache.set(cacheKey, { data, timestamp: now });
        return data;
    } catch (error) {
        console.error('D-Day 가져오기 오류:', error);
        return requestCache.has(cacheKey) ? requestCache.get(cacheKey).data : [];
    }
}

// 서버에서 수행평가 데이터 가져오기 (캐시 적용)
async function fetchAssessmentFromServer() {
    const cacheKey = 'assessment_data';
    const now = Date.now();
    
    if (requestCache.has(cacheKey) && 
        now - requestCache.get(cacheKey).timestamp < 5000) {
        return requestCache.get(cacheKey).data;
    }
    
    try {
        const response = await fetchNewApiWithTimeout(
            `${NEW_API_URL}?action=getAssessment&t=${now}&cache=${Math.random()}`
        );
        if (!response.ok) throw new Error('수행평가 데이터 가져오기 실패');
        
        const result = await response.json();
        if (!result.success) throw new Error(result.error || '수행평가 서버 오류');
        
        const data = result.data || [];
        requestCache.set(cacheKey, { data, timestamp: now });
        return data;
    } catch (error) {
        console.error('수행평가 가져오기 오류:', error);
        return requestCache.has(cacheKey) ? requestCache.get(cacheKey).data : [];
    }
}

// 서버에 D-Day 데이터 추가 (최적화)
async function addDdayToServer(title, date) {
    try {
        const response = await fetchNewApiWithTimeout(
            `${NEW_API_URL}?action=addDday&title=${encodeURIComponent(title)}&date=${encodeURIComponent(date)}&t=${Date.now()}`
        );
        if (!response.ok) throw new Error('D-Day 추가 실패');
        
        const result = await response.json();
        
        // 성공 시 캐시 무효화
        if (result.success) {
            requestCache.delete('dday_data');
        }
        
        return result;
    } catch (error) {
        console.error('D-Day 추가 오류:', error);
        return { success: false, error: error.message };
    }
}

// 서버에 수행평가 데이터 추가 (최적화)
async function addAssessmentToServer(subject, date) {
    try {
        const response = await fetchNewApiWithTimeout(
            `${NEW_API_URL}?action=addAssessment&subject=${encodeURIComponent(subject)}&date=${encodeURIComponent(date)}&t=${Date.now()}`
        );
        if (!response.ok) throw new Error('수행평가 추가 실패');
        
        const result = await response.json();
        
        // 성공 시 캐시 무효화
        if (result.success) {
            requestCache.delete('assessment_data');
        }
        
        return result;
    } catch (error) {
        console.error('수행평가 추가 오류:', error);
        return { success: false, error: error.message };
    }
}

// 서버에서 D-Day 데이터 삭제 (최적화)
async function deleteDdayFromServer(id) {
    try {
        const response = await fetchNewApiWithTimeout(`${NEW_API_URL}?action=deleteDday&id=${id}&t=${Date.now()}`);
        if (!response.ok) throw new Error('D-Day 삭제 실패');
        
        const result = await response.json();
        
        // 성공 시 캐시 무효화
        if (result.success) {
            requestCache.delete('dday_data');
        }
        
        return result;
    } catch (error) {
        console.error('D-Day 삭제 오류:', error);
        return { success: false, error: error.message };
    }
}

// 서버에서 수행평가 데이터 삭제 (최적화)
async function deleteAssessmentFromServer(id) {
    try {
        const response = await fetchNewApiWithTimeout(`${NEW_API_URL}?action=deleteAssessment&id=${id}&t=${Date.now()}`);
        if (!response.ok) throw new Error('수행평가 삭제 실패');
        
        const result = await response.json();
        
        // 성공 시 캐시 무효화
        if (result.success) {
            requestCache.delete('assessment_data');
        }
        
        return result;
    } catch (error) {
        console.error('수행평가 삭제 오류:', error);
        return { success: false, error: error.message };
    }
}

// 서버 데이터와 로컬 데이터 동기화 (최적화)
async function syncWithNewServer() {
    const now = Date.now();
    if (now - lastNewApiSync < 8000) return; // 최소 8초 간격으로 최적화
    
    if (isNewApiUpdating) return; // 이미 업데이트 중이면 스킵
    
    isNewApiUpdating = true;
    
    try {
        console.log('새 서버와 동기화 시작...');
        
        // 병렬 요청으로 성능 최적화
        const [serverDday, serverAssessment] = await Promise.all([
            fetchDdayFromServer(),
            fetchAssessmentFromServer()
        ]);
        
        // 데이터 업데이트 확인
        let ddayChanged = false;
        let assessmentChanged = false;
        
        // D-Day 데이터 비교 (깊은 비교 최적화)
        if (!arraysEqual(serverDdayList, serverDday)) {
            serverDdayList = serverDday;
            ddayChanged = true;
        }
        
        // 수행평가 데이터 비교 (깊은 비교 최적화)
        if (!arraysEqual(serverAssessmentList, serverAssessment)) {
            serverAssessmentList = serverAssessment;
            assessmentChanged = true;
        }
        
        // UI 업데이트 (변경된 경우만)
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
    } finally {
        isNewApiUpdating = false;
    }
}

// 배열 비교 유틸리티 (최적화)
function arraysEqual(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (a.length !== b.length) return false;
    
    for (let i = 0; i < a.length; i++) {
        if (JSON.stringify(a[i]) !== JSON.stringify(b[i])) return false;
    }
    return true;
}

// 새 API 연결 상태 표시
function updateNewApiConnectionStatus(status) {
    const topbar = document.querySelector('.topbar');
    if (!topbar) return;
    
    let statusIndicator = document.getElementById('newApiStatus');
    if (!statusIndicator) {
        statusIndicator = document.createElement('div');
        statusIndicator.id = 'newApiStatus';
        statusIndicator.style.cssText = `
            position: absolute;
            top: 8px;
            right: 8px;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            transition: all 0.3s ease;
            z-index: 1000;
        `;
        topbar.appendChild(statusIndicator);
    }
    
    switch(status) {
        case 'connected':
            statusIndicator.style.backgroundColor = '#10b981';
            statusIndicator.style.boxShadow = '0 0 8px rgba(16, 185, 129, 0.6)';
            statusIndicator.title = '서버 연결됨';
            break;
        case 'connecting':
            statusIndicator.style.backgroundColor = '#fbbf24';
            statusIndicator.style.boxShadow = '0 0 8px rgba(251, 191, 36, 0.6)';
            statusIndicator.title = '서버 연결 중...';
            break;
        case 'error':
            statusIndicator.style.backgroundColor = '#ef4444';
            statusIndicator.style.boxShadow = '0 0 8px rgba(239, 68, 68, 0.6)';
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
    
    if (!subject || !date) { 
        alert('모든 필드를 입력해주세요.'); 
        return; 
    }

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

        // 자동 로컬 저장 fallback
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

// 개선된 날짜 선택기 함수
function createDatePicker(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    // HTML5 date input의 기본 기능 활용
    input.type = 'date';
    input.style.colorScheme = 'dark'; // 다크모드 적용
    
    // 최소 날짜를 오늘로 설정
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    input.min = todayStr;
    
    // 기본값을 오늘로 설정
    if (!input.value) {
        input.value = todayStr;
    }
    
    // 스타일 적용
    input.style.cssText += `
        background: #1e293b;
        border: 1px solid #475569;
        border-radius: 8px;
        color: #f1f5f9;
        padding: 12px;
        font-size: 14px;
        width: 100%;
        cursor: pointer;
    `;
}

// 서버 모달 관련 함수들
function openServerDdayModal() {
    document.getElementById('ddayModal').classList.add('visible');
    
    // 날짜 선택기 초기화
    createDatePicker('ddayDate');
    
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
    
    // 가상 키보드 숨기기
    const keyboard = document.getElementById('ddayKeyboard');
    if (keyboard) keyboard.classList.remove('visible');
    
    // 버튼을 원래대로 복구
    const addButton = document.querySelector('#ddayModal .modal-btn.primary');
    if (addButton && typeof addDday === 'function') {
        addButton.onclick = addDday;
        addButton.textContent = '추가';
    }
}

function openServerAssessmentModal() {
    document.getElementById('assessmentModal').classList.add('visible');
    
    // 날짜 선택기 초기화
    createDatePicker('assessmentDate');
    
    document.getElementById('assessmentSubject').focus();

    const addButton = document.querySelector('#assessmentModal .modal-btn.primary');
    if (addButton) {
        addButton.removeAttribute('onclick');
        addButton.onclick = addServerAssessment;
        addButton.textContent = '수행평가 추가';
    }
}

function closeServerAssessmentModal() {
    document.getElementById('assessmentModal').classList.remove('visible');
    document.getElementById('assessmentSubject').value = '';
    document.getElementById('assessmentDate').value = '';
    
    // 가상 키보드 숨기기
    const keyboard = document.getElementById('assessmentKeyboard');
    if (keyboard) keyboard.classList.remove('visible');
    
    // 버튼을 원래대로 복구
    const addButton = document.querySelector('#assessmentModal .modal-btn.primary');
    if (addButton && typeof addAssessment === 'function') {
        addButton.onclick = addAssessment;
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
    const assessmentAddBtns = document.querySelectorAll('.add-btn');
    if (assessmentAddBtns[1] && assessmentAddBtns[1].getAttribute('onclick') === 'openServerAssessmentModal()') {
        assessmentAddBtns[1].setAttribute('onclick', 'openAssessmentModal()');
        assessmentAddBtns[1].innerHTML = '+ 추가';
    }
    
    console.log('로컬 모드가 활성화되었습니다.');
}

// 연결 테스트 함수 (최적화)
async function testNewApiConnection() {
    console.log('새 API 연결 테스트 중...');
    updateNewApiConnectionStatus('connecting');
    
    try {
        const response = await fetchNewApiWithTimeout(`${NEW_API_URL}?action=test&t=${Date.now()}`);
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

// 초기화 함수 (최적화된 연결 테스트 기반)
async function initializeNewApi() {
    console.log('새 API 초기화 중...');
    updateNewApiConnectionStatus('connecting');

    const isConnected = await testNewApiConnection();
    if (isConnected) {
        enableServerMode();
        await syncWithNewServer();
        
        // 최적화된 주기 동기화
        setInterval(() => {
            if (!isNewApiUpdating && isNewApiConnected) {
                syncWithNewServer();
            }
        }, SYNC_INTERVAL_NEW);

        // 탭 복귀 시 동기화 (최적화)
        let isHidden = false;
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && isHidden) {
                setTimeout(() => {
                    if (!isNewApiUpdating) syncWithNewServer();
                }, 1000);
            }
            isHidden = document.hidden;
        });

        updateNewApiConnectionStatus('connected');
        console.log('새 API 초기화 완료(서버 모드)');
    } else {
        enableLocalMode();
        updateNewApiConnectionStatus('error');
        console.log('새 API 연결 실패 → 로컬 모드로 전환');
    }
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => { initializeNewApi(); }, 1000);
});

// 수동 동기화 함수 (디버깅용)
function manualSync() {
    console.log('수동 동기화 실행...');
    if (!isNewApiUpdating) {
        syncWithNewServer();
    } else {
        console.log('이미 동기화 중입니다...');
    }
}

// 캐시 정리 함수
function clearApiCache() {
    requestCache.clear();
    console.log('API 캐시가 정리되었습니다.');
}

// 글로벌 함수 노출 (디버깅용)
window.manualSync = manualSync;
window.clearApiCache = clearApiCache;
window.testNewApiConnection = testNewApiConnection;

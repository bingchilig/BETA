const API_URL = 'https://script.google.com/macros/s/AKfycbxDjTzOWBeuHXaJRcMY5dv38VzD6vX3_f8VPphtFBf2J9NkQfu-B05BmGl8CmSw7Kav/exec';
const TOTAL_STUDENTS = 29;
const SYNC_INTERVAL = 5000;

const students = [
    {name:"김근우",hakbun:"1101"},{name:"김도연",hakbun:"1102"},{name:"김서윤",hakbun:"1103"},{name:"김수린",hakbun:"1104"},{name:"김정호",hakbun:"1105"},{name:"김태환",hakbun:"1106"},
    {name:"김호태",hakbun:"1107"},{name:"명준현",hakbun:"1108"},{name:"민수연",hakbun:"1109"},{name:"박수찬",hakbun:"1110"},{name:"박시우",hakbun:"1111"},{name:"방서현",hakbun:"1112"},
    {name:"서가별",hakbun:"1113"},{name:"신수안",hakbun:"1114"},{name:"안영은",hakbun:"1115"},{name:"이건우",hakbun:"1116"},{name:"이도연",hakbun:"1117"},{name:"이서연",hakbun:"1118"},
    {name:"이은채",hakbun:"1119"},{name:"이준희",hakbun:"1120"},{name:"이지수",hakbun:"1121"},{name:"장세혁",hakbun:"1122"},{name:"장재영",hakbun:"1123"},{name:"정세훈",hakbun:"1124"},
    {name:"조경윤",hakbun:"1125"},{name:"조현수",hakbun:"1126"},{name:"채현민",hakbun:"1127"},{name:"허시은",hakbun:"1128"},{name:"황연",hakbun:"1129"},{name:"우주현",hakbun:"1130"}
];
const specialStudents = ['장세혁', '조현수', '조경윤'];
const GHOST_STUDENT_HAKBUN = '1115'; 

const mainClasses = ["305호", "301호", "체육관", "화장실", "세미나실", "외출", "기타", "복귀", "조기입실"];

// 기존 etcClasses에서 마지막 4개는 독립 카테고리로 처리
const etcClasses = ["보건실", "과학실", "201", "202", "203", "디지털 컨텐츠실", "회계실습실", "302호", "303호", "304호", "306호", "307호", "휴머노이드", "다목적 실습", "it 실습", "크스실", "kt 실", "3D애니메이션제작실습실", "앱창작실", "음악실", "교무실", "멀티미디어실", "비즈쿨실", "방송실", "시청각실", "결석", "조기 입실", "소풍", "금요귀가", "세탁", "귀가", "럭무실","대강당"];

// 새로 추가된 4개 항목 (마지막 4개) - 독립 카테고리로 처리
const newIndependentClasses = ["금요귀가", "세탁", "귀가", "럭무실"];

// 실제 기타 카테고리 (새로 추가된 4개 제외)
const actualEtcClasses = etcClasses.filter(item => !newIndependentClasses.includes(item));

// 시간표 정의
const weekdaySchedule = [
    { name: "방과후 1타임", start: { hour: 17, minute: 10 }, end: { hour: 17, minute: 50 } },
    { name: "쉬는시간", start: { hour: 17, minute: 50 }, end: { hour: 17, minute: 55 } },
    { name: "방과후 2타임", start: { hour: 17, minute: 55 }, end: { hour: 18, minute: 35 } },
    { name: "저녁시간", start: { hour: 18, minute: 35 }, end: { hour: 19, minute: 50 } },
    { name: "야자 1타임", start: { hour: 19, minute: 50 }, end: { hour: 21, minute: 10 } },
    { name: "쉬는시간", start: { hour: 21, minute: 10 }, end: { hour: 21, minute: 30 } },
    { name: "야자 2타임", start: { hour: 21, minute: 30 }, end: { hour: 22, minute: 50 } }
];

const sundaySchedule = [
    { name: "야자 1타임", start: { hour: 20, minute: 0 }, end: { hour: 21, minute: 0 } },
    { name: "쉬는시간", start: { hour: 21, minute: 0 }, end: { hour: 21, minute: 20 } },
    { name: "야자 2타임", start: { hour: 21, minute: 20 }, end: { hour: 22, minute: 20 } }
];

// DOM 요소들
const seatGrid = document.getElementById('seatGrid');
const classPanel = document.getElementById('classPanel');
const clockEl = document.getElementById('clock');
const totalEl = document.getElementById('total');
const presentEl = document.getElementById('present');
const absentEl = document.getElementById('absent');
const bearingOverlay = document.getElementById('bearingOverlay');
const bearingSide = document.getElementById('bearingSide');
const etcList = document.getElementById('etcList');
const ddayContainer = document.getElementById('ddayContainer');
const assessmentContainer = document.getElementById('assessmentContainer');
const scheduleInfo = document.getElementById('scheduleInfo');
const currentPeriodEl = document.getElementById('currentPeriod');
const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');

let sheetData = new Map();
let currentStudent = null;
let ddayList = JSON.parse(localStorage.getItem('ddayList') || '[]');
let assessmentList = JSON.parse(localStorage.getItem('assessmentList') || '[]');
let currentActiveInput = 'ddayTitle';

document.addEventListener('DOMContentLoaded', () => {
    totalEl.textContent = TOTAL_STUDENTS;
    initializeSeats();
    startClock();
    setupEtcList();
    updateDdayDisplay();
    updateAssessmentDisplay();
    
    // 테스트 데이터
    sheetData.set('1115', { location: '잠시 귀가', reason: '잠시 귀가' });
    
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.bearing-overlay') && !e.target.closest('.seat') && !e.target.closest('.bearing-side')) {
            hideBearing();
        }
        
        // 가상 키보드 숨기기
        if (!e.target.closest('.virtual-keyboard') && !e.target.closest('.form-input')) {
            document.querySelectorAll('.virtual-keyboard').forEach(kb => {
                kb.classList.remove('visible');
            });
        }

        // 자세히 보기 모달 닫기
        if (!e.target.closest('.detail-modal-content') && !e.target.closest('.detail-btn')) {
            closeDetailModal();
        }
    });

    // 입력 필드 포커스 시 가상 키보드 표시
    document.getElementById('ddayTitle').addEventListener('focus', () => {
        currentActiveInput = 'ddayTitle';
        document.getElementById('ddayKeyboard').classList.add('visible');
    });

    document.getElementById('assessmentSubject').addEventListener('focus', () => {
        currentActiveInput = 'assessmentSubject';
        document.getElementById('assessmentKeyboard').classList.add('visible');
    });
    
    updateCounts();
    updateAllUI();
    syncData();
    setInterval(syncData, SYNC_INTERVAL);
});

function startClock() {
    const updateClock = () => {
        const now = new Date();
        clockEl.textContent = now.toLocaleTimeString('ko-KR', { hour12: false });
        updateScheduleInfo(now);
    };
    updateClock();
    setInterval(updateClock, 1000);
}

function updateScheduleInfo(now) {
    const day = now.getDay();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const currentMinutes = hour * 60 + minute;

    let schedule = [];
    let shouldShowProgress = false;

    const isHoliday = false;

    if (day === 0 && !isHoliday) { // 일요일
        schedule = sundaySchedule;
        shouldShowProgress = true;
    } else if (day >= 1 && day <= 5 && !isHoliday) { // 평일
        schedule = weekdaySchedule;
        shouldShowProgress = true;
    }

    if (shouldShowProgress && schedule.length > 0) {
        const currentPeriod = getCurrentPeriod(schedule, currentMinutes);
        
        if (currentPeriod) {
            currentPeriodEl.textContent = currentPeriod.name;
            progressContainer.style.display = 'flex';
            
            const progress = calculateProgress(currentPeriod, currentMinutes);
            progressFill.style.width = `${progress}%`;
            progressText.textContent = `${Math.round(progress)}%`;
        } else {
            currentPeriodEl.textContent = '';
            progressContainer.style.display = 'none';
        }
    } else {
        currentPeriodEl.textContent = '';
        progressContainer.style.display = 'none';
    }
}

function getCurrentPeriod(schedule, currentMinutes) {
    for (const period of schedule) {
        const startMinutes = period.start.hour * 60 + period.start.minute;
        const endMinutes = period.end.hour * 60 + period.end.minute;
        
        if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
            return {
                ...period,
                startMinutes,
                endMinutes
            };
        }
    }
    return null;
}

function calculateProgress(period, currentMinutes) {
    const totalDuration = period.endMinutes - period.startMinutes;
    const elapsed = currentMinutes - period.startMinutes;
    return Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
}
function showLoading() {
    const seatsContainer = document.querySelector('.seats-container');
    if (!seatsContainer) return;
    
    let loadingOverlay = seatsContainer.querySelector('.loading-overlay');
    if (!loadingOverlay) {
        loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'loading-overlay';
        loadingOverlay.innerHTML = `
            <div class="loading-spinner"></div>
            <div class="loading-text">서버에 전송 중...</div>
        `;
        seatsContainer.appendChild(loadingOverlay);
    }
    loadingOverlay.classList.add('visible');
}

function hideLoading() {
    const loadingOverlay = document.querySelector('.loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.classList.remove('visible');
    }
}
function initializeSeats() {
    seatGrid.innerHTML = '';
    const activeStudents = students.filter(s => s.hakbun !== GHOST_STUDENT_HAKBUN);
    
    activeStudents.forEach((student, index) => {
        let actualIndex = index;
        if (index >= 14) {
            actualIndex = index + 1;
        }
        
        const seatEl = document.createElement('div');
        seatEl.className = 'seat';
        const row = Math.floor(actualIndex / 6);
        seatEl.dataset.row = row;
        
        if (specialStudents.includes(student.name)) {
            seatEl.classList.add('special');
        }
        
        if (row == 0) seatEl.style.background = 'linear-gradient(135deg, #fdba74, #f97316)';
        if (row == 1) seatEl.style.background = 'linear-gradient(135deg, #fde047, #eab308)';
        if (row == 2) seatEl.style.background = 'linear-gradient(135deg, #c4b5fd, #8b5cf6)';
        if (row == 3) seatEl.style.background = 'linear-gradient(135deg, #93c5fd, #3b82f6)';
        if (row >= 4) seatEl.style.background = 'linear-gradient(135deg, #86efac, #22c55e)';

        seatEl.dataset.hakbun = student.hakbun;
        seatEl.innerHTML = `<div class="student-name">${student.name}</div><small>${student.hakbun}</small>`;
        seatEl.addEventListener('click', (e) => {
            currentStudent = student;
            showBearing(e.currentTarget);
        });
        
        if (index === 13) {
            seatGrid.appendChild(seatEl);
            const emptySpace = document.createElement('div');
            seatGrid.appendChild(emptySpace);
        } else {
            seatGrid.appendChild(seatEl);
        }
    });
}

function setupEtcList() {
    etcList.innerHTML = '';
    etcClasses.forEach(className => {
        const chip = document.createElement('div');
        chip.className = 'etc-chip';
        chip.textContent = className;
        chip.addEventListener('click', () => handleLocationChoice(className));
        etcList.appendChild(chip);
    });
}

function showBearing(seatEl) {
    if (!currentStudent) return;
    let sectorsHTML = mainClasses.map((loc, i) => {
        const dataValue = loc === '화장실' ? '화장실 & 정수기' : loc;
        return `<div class="sector s-${i + 1}" data-value="${dataValue}">${loc}</div>`;
    }).join('');
    bearingOverlay.innerHTML = `<div class="bearing-container"><div class="center-name" data-value="복귀">${currentStudent.name}<br><small>복귀</small></div>${sectorsHTML}</div>`;
    
    bearingOverlay.querySelectorAll('[data-value]').forEach(el => {
        el.addEventListener('click', e => {
            e.stopPropagation();
            handleLocationChoice(el.dataset.value);
        });
    });
    
    const seatRect = seatEl.getBoundingClientRect();
    let top = seatRect.top + window.scrollY + seatRect.height / 2 - 85;
    let left = seatRect.left + window.scrollX + seatRect.width / 2 - 85;
    
    if (left < 300) left = 300;
    
    if (top + 170 > window.innerHeight) top = window.innerHeight - 170;
    if (top < 0) top = 10;
    bearingOverlay.style.top = `${top}px`;
    bearingOverlay.style.left = `${left}px`;
    bearingOverlay.classList.add('visible');
}

function hideBearing() {
    bearingOverlay.classList.remove('visible');
    bearingSide.classList.remove('visible');
}

function handleLocationChoice(location) {
    if (!currentStudent) return;
    if (location === '기타') {
        const bearingRect = bearingOverlay.getBoundingClientRect();
        bearingSide.style.top = `${bearingRect.top}px`;
        bearingSide.style.left = `${bearingRect.left - 280}px`;
        bearingSide.classList.add('visible');
        return;
    }
    const locationToSend = (location === '복귀') ? '' : location;
    updateLocation(currentStudent, locationToSend);
    hideBearing();
}

async function updateLocation(student, location) {
    const reason = getReason(location);
    document.body.style.cursor = 'wait';
    try {
        if (location === '') {
            sheetData.delete(student.hakbun);
        } else {
            sheetData.set(student.hakbun, { location, reason });
        }
        updateAllUI();
        
        const response = await fetch(`${API_URL}?action=update&hakbun=${student.hakbun}&location=${encodeURIComponent(location)}&reason=${encodeURIComponent(reason)}`);
        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error || "Unknown server error");
        }
    } catch (error) {
        console.error("Update/Sync Error:", error);
        alert(`업데이트 중 오류가 발생했습니다: ${error.message}\n잠시 후 서버 데이터로 복구됩니다.`);
        setTimeout(syncData, 2000);
    } finally {
        document.body.style.cursor = 'default';
    }
}

function getReason(location) {
    const specialReasons = ["화장실 & 정수기", "외출", "결석", "교무실", "조기 입실"];
    if (location === "" || specialReasons.includes(location)) return location;
    const time = new Date().getHours() * 60 + new Date().getMinutes();
    if (time >= 900 && time <= 1115) return '방과후';
    if (time >= 1140 || time < 410) return '동아리';
    return '조기 입실';
}

async function syncData() {
    try {
        const response = await fetch(`${API_URL}?action=get&t=${Date.now()}`);
        if (!response.ok) throw new Error(`네트워크 응답이 올바르지 않습니다: ${response.statusText}`);
        const result = await response.json();
        if (!result.success) throw new Error(result.error);

        sheetData.clear();
        result.data.forEach(row => {
            if (row.hakbun !== GHOST_STUDENT_HAKBUN) {
                const hasLocation = row.location && String(row.location).trim() !== '';
                if (hasLocation) {
                    sheetData.set(String(row.hakbun), row);
                }
            }
        });

        updateAllUI();
    } catch (error) {
        console.error("Sync Error:", error);
        updateCounts();
    }
}

function updateAllUI() {
    updateSeatsDisplay();
    updateRightPanel();
    updateCounts();
}

function updateSeatsDisplay() {
    document.querySelectorAll('.seat').forEach(seatEl => {
        const hakbun = seatEl.dataset.hakbun;
        if (!hakbun) return;

        const row = sheetData.get(hakbun);
        const hasLocation = row && typeof row.location === 'string' && row.location.trim() !== '';

        seatEl.classList.toggle('moved', !!hasLocation);
    });
}

// **수정된 핵심 함수 - 새로운 독립 카테고리 처리**
function updateRightPanel() {
    classPanel.innerHTML = '';
    const groups = new Map();
    
    sheetData.forEach((data, hakbun) => {
        const student = students.find(s => s.hakbun === hakbun);
        if (!student) return;
        
        let groupName;
        
        // 새로 추가된 4개 항목은 독립 카테고리로 처리
        if (newIndependentClasses.includes(data.location)) {
            groupName = data.location;
        }
        // 기존 etcClasses (새로 추가된 4개 제외)는 "기타"로 분류
        else if (actualEtcClasses.includes(data.location)) {
            groupName = '기타';
        }
        // mainClasses는 그대로 사용
        else {
            groupName = data.location;
        }
        
        if (!groups.has(groupName)) groups.set(groupName, []);
        groups.get(groupName).push({ student, data });
    });
    
    groups.forEach((list, groupName) => {
        const groupEl = document.createElement('div');
        groupEl.className = 'group';
        
        // 기타 그룹에 자세히 보기 버튼 추가
        let headerContent = `<div class="group-title-large">${groupName}</div><div class="badge enlarged-badge">${list.length}명</div>`;
        if (groupName === '기타') {
            headerContent += '<button class="detail-btn" onclick="showDetailModal()">자세히</button>';
        }
        
        const chipsHTML = list.map(item => {
            if (groupName === '기타') {
                return `<div class="chip enlarged">
                    <span class="student-name-large">${item.student.name}</span>
                    <small class="location-large">(${item.data.location})</small>
                </div>`;
            } else {
                return `<div class="chip enlarged">
                    <span class="student-name-large">${item.student.name}</span>
                </div>`;
            }
        }).join('');
        
        groupEl.innerHTML = `
            <div class="ghead enlarged-header">${headerContent}</div>
            <div class="chips">${chipsHTML}</div>
        `;
        classPanel.appendChild(groupEl);
    });
}

// 자세히 보기 모달 관련 함수들
function showDetailModal() {
    const modal = document.getElementById('detailModal');
    const content = document.getElementById('detailModalContent');
    
    // 기타 카테고리에 속한 학생들을 카테고리별로 분류
    const etcStudents = new Map();
    
    sheetData.forEach((data, hakbun) => {
        const student = students.find(s => s.hakbun === hakbun);
        if (!student) return;
        
        if (actualEtcClasses.includes(data.location)) {
            if (!etcStudents.has(data.location)) {
                etcStudents.set(data.location, []);
            }
            etcStudents.get(data.location).push(student);
        }
    });
    
    // 컨텐츠 생성
    let contentHTML = '<div class="detail-modal-header">기타 카테고리 상세보기</div>';
    contentHTML += '<div class="detail-categories">';
    
    etcStudents.forEach((studentList, category) => {
        contentHTML += `
            <div class="detail-category">
                <div class="detail-category-title">${category}</div>
                <div class="detail-student-list">
                    ${studentList.map(student => 
                        `<div class="detail-student-item">${student.name}</div>`
                    ).join('')}
                </div>
            </div>
        `;
    });
    
    contentHTML += '</div>';
    content.innerHTML = contentHTML;
    modal.classList.add('visible');
}

function closeDetailModal() {
    const modal = document.getElementById('detailModal');
    modal.classList.remove('visible');
}

function updateCounts() {
    const absentCount = sheetData.size;
    const presentCount = TOTAL_STUDENTS - absentCount;
    presentEl.textContent = presentCount;
    absentEl.textContent = absentCount;
}

// D-Day 관련 함수들
function openDdayModal() {
    document.getElementById('ddayModal').classList.add('visible');
    document.getElementById('ddayTitle').focus();
}

function closeDdayModal() {
    document.getElementById('ddayModal').classList.remove('visible');
    document.getElementById('ddayTitle').value = '';
    document.getElementById('ddayDate').value = '';
    document.getElementById('ddayKeyboard').classList.remove('visible');
}

function addDday() {
    const title = document.getElementById('ddayTitle').value.trim();
    const date = document.getElementById('ddayDate').value;
    
    if (!title || !date) {
        alert('모든 필드를 입력해주세요.');
        return;
    }
    
    ddayList.push({ title, date, id: Date.now() });
    localStorage.setItem('ddayList', JSON.stringify(ddayList));
    updateDdayDisplay();
    closeDdayModal();
}

function deleteDday(id) {
    ddayList = ddayList.filter(item => item.id !== id);
    localStorage.setItem('ddayList', JSON.stringify(ddayList));
    updateDdayDisplay();
}

function updateDdayDisplay() {
    ddayContainer.innerHTML = '';
    const today = new Date();
    
    ddayList.forEach(item => {
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
                <div class="dday-title-large">${item.title}</div>
                <div class="dday-date">${new Date(item.date).toLocaleDateString('ko-KR')}</div>
            </div>
            <div class="dday-counter ${ddayClass}">${ddayText}</div>
            <button class="delete-btn" onclick="deleteDday(${item.id})">삭제</button>
        `;
        ddayContainer.appendChild(ddayEl);
    });
}

// 수행평가 관련 함수들
function openAssessmentModal() {
    document.getElementById('assessmentModal').classList.add('visible');
    document.getElementById('assessmentSubject').focus();
}

function closeAssessmentModal() {
    document.getElementById('assessmentModal').classList.remove('visible');
    document.getElementById('assessmentSubject').value = '';
    document.getElementById('assessmentDate').value = '';
    document.getElementById('assessmentKeyboard').classList.remove('visible');
}

function addAssessment() {
    const subject = document.getElementById('assessmentSubject').value.trim();
    const date = document.getElementById('assessmentDate').value;
    
    if (!subject || !date) {
        alert('모든 필드를 입력해주세요.');
        return;
    }
    
    assessmentList.push({ subject, date, id: Date.now() });
    localStorage.setItem('assessmentList', JSON.stringify(assessmentList));
    updateAssessmentDisplay();
    closeAssessmentModal();
}

function deleteAssessment(id) {
    assessmentList = assessmentList.filter(item => item.id !== id);
    localStorage.setItem('assessmentList', JSON.stringify(assessmentList));
    updateAssessmentDisplay();
}

function updateAssessmentDisplay() {
    assessmentContainer.innerHTML = '';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    assessmentList.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    assessmentList.forEach(item => {
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
                <div class="assessment-subject-large">${item.subject}</div>
                <div class="assessment-date">${new Date(item.date).toLocaleDateString('ko-KR')}</div>
            </div>
            <div class="assessment-status ${statusClass}">${status}</div>
            <button class="delete-btn" onclick="deleteAssessment(${item.id})">삭제</button>
        `;
        assessmentContainer.appendChild(assessmentEl);
    });
}

// 가상 키보드 관련 함수들
function typeKey(key, inputId = null) {
    const targetId = inputId || currentActiveInput;
    const input = document.getElementById(targetId);
    if (input) {
        input.value += key;
    }
}

function backspaceKey(inputId = null) {
    const targetId = inputId || currentActiveInput;
    const input = document.getElementById(targetId);
    if (input) {
        input.value = input.value.slice(0, -1);
    }
}

// 방과후 후 초기화 함수
async function resetAfterSchool() {
    if (!confirm('방과후가 끝난 후 초기화를 진행하시겠습니까?\n(외출, 결석, 금요귀가, 소풍 제외)')) {
        return;
    }

    document.body.style.cursor = 'wait';
    
    try {
        const studentsToReset = [];
        
        sheetData.forEach((data, hakbun) => {
            const keepLocations = ['외출', '결석', '금요귀가', '소풍'];
            if (!keepLocations.includes(data.location)) {
                studentsToReset.push(hakbun);
            }
        });

        for (const hakbun of studentsToReset) {
            try {
                const response = await fetch(`${API_URL}?action=update&hakbun=${hakbun}&location=&reason=`);
                const result = await response.json();
                if (result.success) {
                    sheetData.delete(hakbun);
                } else {
                    console.error(`Failed to reset student ${hakbun}:`, result.error);
                }
            } catch (error) {
                console.error(`Error resetting student ${hakbun}:`, error);
            }
            
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        updateAllUI();
        alert(`${studentsToReset.length}명의 학생이 초기화되었습니다.`);
        setTimeout(syncData, 1000);
        
    } catch (error) {
        console.error("Reset Error:", error);
        alert(`초기화 중 오류가 발생했습니다: ${error.message}`);
    } finally {
        document.body.style.cursor = 'default';
    }
}

/* =========================
사진 갤러리(슬라이드) 모듈 - Crossfade 버전
========================= */
const GALLERY_INTERVAL_MS = 10000;

const galleryImages = [
'images/이비1.jpeg',
'images/이비2.jpeg',
'images/이비3.jpeg',
'images/이비4.jpeg',
'images/이비5.jpeg',
'images/이비6.jpeg',
'images/이비7.jpeg',
'images/이비8.jpeg',
'images/이비9.jpeg',
'images/이비10.jpeg',
'images/이비11.jpeg',
'images/이비12.jpeg',
'images/이비13.jpeg',
'images/이비14.jpeg',
'images/이비15.jpeg',
'images/이비16.jpeg',
'images/이비17.jpeg',
'images/이비18.jpeg',
'images/이비19.jpeg',
];

let galleryIndex = 0;
let galleryTimer = null;
let layerA = null;
let layerB = null;
let activeLayerKey = 'A';

function ensureLayers() {
const wrapper = document.getElementById('galleryWrapper');
if (!wrapper) return false;

if (layerA && layerB) return true;

layerA = document.createElement('img');
layerA.id = 'galleryLayerA';
layerA.className = 'gallery-layer is-active';

layerB = document.createElement('img');
layerB.id = 'galleryLayerB';
layerB.className = 'gallery-layer';

wrapper.insertBefore(layerB, wrapper.firstChild);
wrapper.insertBefore(layerA, wrapper.firstChild);

return true;
}

function updateIndicators() {
const indicators = document.getElementById('galleryIndicators');
if (!indicators) return;
[...indicators.children].forEach((child, i) => {
    child.classList.toggle('active', i === galleryIndex);
});
}

function crossFadeTo(index) {
    if (!ensureLayers()) return;

const nextSrc = galleryImages[index];
const nextLayer = activeLayerKey === 'A' ? layerB : layerA;
const curLayer  = activeLayerKey === 'A' ? layerA : layerB;

const doFade = () => {
    nextLayer.classList.add('is-active');
    curLayer.classList.remove('is-active');
    activeLayerKey = (nextLayer === layerA) ? 'A' : 'B';
    updateIndicators();
};

if (nextLayer.src === nextSrc && nextLayer.complete) {
    doFade();
} else {
    nextLayer.onload = () => { nextLayer.onload = null; doFade(); };
    nextLayer.src = nextSrc;
}
}

function renderGallery() {
if (!ensureLayers()) return;
const firstSrc = galleryImages[galleryIndex] || '';
layerA.src = firstSrc;
layerA.classList.add('is-active');
layerB.classList.remove('is-active');
activeLayerKey = 'A';
updateIndicators();
}

function createIndicators() {
const indicators = document.getElementById('galleryIndicators');
if (!indicators) return;
indicators.innerHTML = '';
galleryImages.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'dot' + (i === galleryIndex ? ' active' : '');
    dot.setAttribute('aria-label', `${i + 1}번 이미지`);
    dot.addEventListener('click', () => {
    galleryIndex = i;
    crossFadeTo(galleryIndex);
    resetGalleryTimer();
    });
    indicators.appendChild(dot);
});
}

function nextImage() {
if (galleryImages.length <= 1) return;
galleryIndex = (galleryIndex + 1) % galleryImages.length;
crossFadeTo(galleryIndex);
}

function prevImage() {
if (galleryImages.length <= 1) return;
galleryIndex = (galleryIndex - 1 + galleryImages.length) % galleryImages.length;
crossFadeTo(galleryIndex);
}

function startGalleryTimer() {
if (galleryTimer) clearInterval(galleryTimer);
galleryTimer = setInterval(nextImage, GALLERY_INTERVAL_MS);
}

function resetGalleryTimer() { startGalleryTimer(); }

function preloadGallery() {
galleryImages.forEach(src => { const i = new Image(); i.src = src; });
}

function initGallery() {
if (!galleryImages.length) return;

const wrapper = document.getElementById('galleryWrapper');
const showControls = galleryImages.length > 1;

if (wrapper) {
    wrapper.querySelectorAll('.gallery-nav').forEach(btn => {
    btn.style.display = showControls ? 'block' : 'none';
    });
    const indicators = document.getElementById('galleryIndicators');
    if (indicators) {
    indicators.style.display = showControls ? 'flex' : 'none';
    if (showControls) createIndicators();
    }

    wrapper.addEventListener('mouseenter', () => { if (galleryTimer) clearInterval(galleryTimer); });
    wrapper.addEventListener('mouseleave', startGalleryTimer);
}

ensureLayers();
preloadGallery();
renderGallery();
startGalleryTimer();
}

window.addEventListener('DOMContentLoaded', initGallery);
window.nextImage = nextImage;
window.prevImage = prevImage;
// 기존 변수들에 추가
let lastResetDate = localStorage.getItem('lastResetDate') || '';
let isResetting = false;

// 초기화 시간 설정 (24시간 형식)
const RESET_TIMES = {
    weekday: [
        { hour: 17, minute: 5, name: '방과후 전 초기화' },   // 방과후 시작 5분 전
        { hour: 23, minute: 0, name: '야자 종료 후 초기화' }  // 야자 완전 종료 후
    ],
    sunday: [
        { hour: 19, minute: 55, name: '일요일 야자 전 초기화' }, // 일요일 야자 시작 5분 전
        { hour: 22, minute: 25, name: '일요일 야자 종료 후 초기화' } // 일요일 야자 종료 후
    ]
};

// 초기화 예외 항목 (초기화되지 않을 위치들)
const RESET_EXCEPTIONS = ['외출', '결석', '금요귀가', '소풍', '조기 입실'];

// 기존 startClock 함수 수정
function startClock() {
    const updateClock = () => {
        const now = new Date();
        clockEl.textContent = now.toLocaleTimeString('ko-KR', { hour12: false });
        updateScheduleInfo(now);
        checkAutoReset(now); // 자동 초기화 체크 추가
    };
    updateClock();
    setInterval(updateClock, 1000);
}

// 자동 초기화 체크 함수
function checkAutoReset(now) {
    if (isResetting) return; // 이미 초기화 중이면 중단

    const today = now.toDateString();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const dayOfWeek = now.getDay(); // 0: 일요일, 1-6: 월-토
    
    // 오늘 이미 초기화했는지 확인
    const lastReset = localStorage.getItem('lastResetDate');
    if (lastReset === today) return;

    let shouldReset = false;
    let resetReason = '';

    // 평일 (월-금) 초기화 시간 체크
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        for (const resetTime of RESET_TIMES.weekday) {
            if (currentHour === resetTime.hour && currentMinute === resetTime.minute) {
                shouldReset = true;
                resetReason = resetTime.name;
                break;
            }
        }
    }
    // 일요일 초기화 시간 체크
    else if (dayOfWeek === 0) {
        for (const resetTime of RESET_TIMES.sunday) {
            if (currentHour === resetTime.hour && currentMinute === resetTime.minute) {
                shouldReset = true;
                resetReason = resetTime.name;
                break;
            }
        }
    }
    // 토요일은 초기화 없음 (주말)

    if (shouldReset) {
        console.log(`자동 초기화 실행: ${resetReason}`);
        performAutoReset(resetReason, today);
    }
}

// 자동 초기화 실행 함수
async function performAutoReset(reason, dateString) {
    if (isResetting) return;
    
    isResetting = true;
    console.log(`자동 초기화 시작: ${reason}`);
    
    try {
        const studentsToReset = [];
        
        // 초기화 대상 학생들 찾기
        sheetData.forEach((data, hakbun) => {
            // 예외 항목에 해당하지 않는 학생들만 초기화
            if (!RESET_EXCEPTIONS.includes(data.location)) {
                studentsToReset.push(hakbun);
            }
        });

        if (studentsToReset.length === 0) {
            console.log('초기화할 학생이 없습니다.');
            localStorage.setItem('lastResetDate', dateString);
            return;
        }

        // 서버에 초기화 요청
        for (const hakbun of studentsToReset) {
            try {
                const response = await fetch(`${API_URL}?action=update&hakbun=${hakbun}&location=&reason=`);
                const result = await response.json();
                if (result.success) {
                    sheetData.delete(hakbun);
                } else {
                    console.error(`Failed to auto-reset student ${hakbun}:`, result.error);
                }
            } catch (error) {
                console.error(`Error auto-resetting student ${hakbun}:`, error);
            }
            
            // 서버 과부하 방지를 위한 짧은 대기
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        updateAllUI();
        console.log(`자동 초기화 완료: ${studentsToReset.length}명 초기화됨`);
        
        // 초기화 완료 표시 (UI에 짧은 알림)
        showAutoResetNotification(reason, studentsToReset.length);
        
        // 오늘 초기화 완료 기록
        localStorage.setItem('lastResetDate', dateString);
        
        // 데이터 동기화
        setTimeout(syncData, 1000);
        
    } catch (error) {
        console.error("Auto Reset Error:", error);
    } finally {
        isResetting = false;
    }
}

// 자동 초기화 알림 표시 함수
function showAutoResetNotification(reason, count) {
    const notification = document.createElement('div');
    notification.className = 'auto-reset-notification';
    notification.innerHTML = `
        <div class="notification-content">
            <div class="notification-title">자동 초기화 완료</div>
            <div class="notification-message">${reason}<br>${count}명 초기화됨</div>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // 3초 후 자동 제거
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

// 수동 초기화 함수 수정 (기존 resetAfterSchool 함수 개선)
async function resetAfterSchool() {
    if (!confirm('수동 초기화를 진행하시겠습니까?\n(외출, 결석, 금요귀가, 소풍, 조기 입실 제외)')) {
        return;
    }

    if (isResetting) {
        alert('현재 초기화가 진행 중입니다. 잠시 후 다시 시도해주세요.');
        return;
    }

    isResetting = true;
    document.body.style.cursor = 'wait';
    
    try {
        const studentsToReset = [];
        
        sheetData.forEach((data, hakbun) => {
            if (!RESET_EXCEPTIONS.includes(data.location)) {
                studentsToReset.push(hakbun);
            }
        });

        for (const hakbun of studentsToReset) {
            try {
                const response = await fetch(`${API_URL}?action=update&hakbun=${hakbun}&location=&reason=`);
                const result = await response.json();
                if (result.success) {
                    sheetData.delete(hakbun);
                } else {
                    console.error(`Failed to reset student ${hakbun}:`, result.error);
                }
            } catch (error) {
                console.error(`Error resetting student ${hakbun}:`, error);
            }
            
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        updateAllUI();
        alert(`${studentsToReset.length}명의 학생이 수동 초기화되었습니다.`);
        setTimeout(syncData, 1000);
        
    } catch (error) {
        console.error("Manual Reset Error:", error);
        alert(`수동 초기화 중 오류가 발생했습니다: ${error.message}`);
    } finally {
        document.body.style.cursor = 'default';
        isResetting = false;
    }
}

// 초기화 상태 확인 함수 (디버깅용)
function getResetStatus() {
    const now = new Date();
    const lastReset = localStorage.getItem('lastResetDate');
    const today = now.toDateString();
    
    return {
        today: today,
        lastResetDate: lastReset,
        needsReset: lastReset !== today,
        isResetting: isResetting,
        currentTime: now.toLocaleTimeString('ko-KR', { hour12: false }),
        dayOfWeek: ['일', '월', '화', '수', '목', '금', '토'][now.getDay()]
    };
}

// 초기화 시간표 확인 함수 (디버깅용)
function getResetSchedule() {
    const now = new Date();
    const dayOfWeek = now.getDay();
    
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        return {
            day: '평일',
            schedule: RESET_TIMES.weekday.map(t => `${t.hour.toString().padStart(2, '0')}:${t.minute.toString().padStart(2, '0')} - ${t.name}`)
        };
    } else if (dayOfWeek === 0) {
        return {
            day: '일요일',
            schedule: RESET_TIMES.sunday.map(t => `${t.hour.toString().padStart(2, '0')}:${t.minute.toString().padStart(2, '0')} - ${t.name}`)
        };
    } else {
        return {
            day: '토요일',
            schedule: ['초기화 없음 (주말)']
        };
    }
}

// 전역 함수로 등록 (콘솔에서 디버깅 가능)
window.getResetStatus = getResetStatus;
window.getResetSchedule = getResetSchedule;
window.performAutoReset = performAutoReset;
// 초기화 버튼 상태 관리 함수들

// 초기화 버튼 상태 업데이트
function updateResetButtonState(state) {
    const resetBtn = document.querySelector('.reset-btn');
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    
    if (!resetBtn || !statusDot || !statusText) return;
    
    // 모든 상태 클래스 제거
    resetBtn.classList.remove('resetting', 'success', 'error');
    statusDot.classList.remove('resetting', 'error');
    
    switch (state) {
        case 'idle':
            resetBtn.disabled = false;
            statusDot.className = 'status-dot';
            statusText.textContent = '자동 대기';
            break;
            
        case 'resetting':
            resetBtn.disabled = true;
            resetBtn.classList.add('resetting');
            statusDot.classList.add('resetting');
            statusText.textContent = '초기화 중';
            break;
            
        case 'success':
            resetBtn.classList.add('success');
            statusText.textContent = '완료';
            setTimeout(() => {
                updateResetButtonState('idle');
            }, 2000);
            break;
            
        case 'error':
            resetBtn.classList.add('error');
            statusDot.classList.add('error');
            statusText.textContent = '오류 발생';
            setTimeout(() => {
                updateResetButtonState('idle');
            }, 3000);
            break;
            
        case 'auto-reset':
            statusDot.classList.add('resetting');
            statusText.textContent = '자동 초기화';
            setTimeout(() => {
                updateResetButtonState('idle');
            }, 3000);
            break;
    }
}

// 자동 초기화 상태 표시 업데이트
function updateAutoResetStatus() {
    const now = new Date();
    const resetStatus = getResetStatus();
    const resetSchedule = getResetSchedule();
    
    const statusText = document.getElementById('statusText');
    if (!statusText) return;
    
    // 오늘 이미 초기화했는지 확인
    if (resetStatus.lastResetDate === resetStatus.today) {
        statusText.textContent = '오늘 완료';
        return;
    }
    
    // 다음 초기화 시간까지 남은 시간 계산
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;
    
    if (resetSchedule.day === '토요일') {
        statusText.textContent = '주말 휴식';
        return;
    }
    
    // 오늘의 초기화 시간들 가져오기
    const todayResetTimes = resetSchedule.day === '일요일' ? 
        RESET_TIMES.sunday : RESET_TIMES.weekday;
    
    // 다음 초기화 시간 찾기
    let nextResetTime = null;
    for (const resetTime of todayResetTimes) {
        const resetTimeInMinutes = resetTime.hour * 60 + resetTime.minute;
        if (currentTimeInMinutes < resetTimeInMinutes) {
            nextResetTime = resetTime;
            break;
        }
    }
    
    if (nextResetTime) {
        const remainingMinutes = (nextResetTime.hour * 60 + nextResetTime.minute) - currentTimeInMinutes;
        const remainingHours = Math.floor(remainingMinutes / 60);
        const remainingMins = remainingMinutes % 60;
        
        if (remainingHours > 0) {
            statusText.textContent = `${remainingHours}시간 ${remainingMins}분 후`;
        } else {
            statusText.textContent = `${remainingMins}분 후`;
        }
    } else {
        statusText.textContent = '오늘 종료';
    }
}

// 수동 초기화 함수 수정 (기존 resetAfterSchool 함수 개선)
async function resetAfterSchool() {
    if (!confirm('수동 초기화를 진행하시겠습니까?\n(외출, 결석, 금요귀가, 소풍, 조기 입실 제외)')) {
        return;
    }

    if (isResetting) {
        alert('현재 초기화가 진행 중입니다. 잠시 후 다시 시도해주세요.');
        return;
    }

    updateResetButtonState('resetting');
    
    try {
        const studentsToReset = [];
        
        sheetData.forEach((data, hakbun) => {
            if (!RESET_EXCEPTIONS.includes(data.location)) {
                studentsToReset.push(hakbun);
            }
        });

        if (studentsToReset.length === 0) {
            alert('초기화할 학생이 없습니다.');
            updateResetButtonState('idle');
            return;
        }

        isResetting = true;

        for (const hakbun of studentsToReset) {
            try {
                const response = await fetch(`${API_URL}?action=update&hakbun=${hakbun}&location=&reason=`);
                const result = await response.json();
                if (result.success) {
                    sheetData.delete(hakbun);
                } else {
                    console.error(`Failed to reset student ${hakbun}:`, result.error);
                }
            } catch (error) {
                console.error(`Error resetting student ${hakbun}:`, error);
            }
            
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        updateAllUI();
        updateResetButtonState('success');
        alert(`${studentsToReset.length}명의 학생이 수동 초기화되었습니다.`);
        setTimeout(syncData, 1000);
        
    } catch (error) {
        console.error("Manual Reset Error:", error);
        updateResetButtonState('error');
        alert(`수동 초기화 중 오류가 발생했습니다: ${error.message}`);
    } finally {
        isResetting = false;
    }
}

// 자동 초기화 함수 수정 (알림 표시 개선)
async function performAutoReset(reason, dateString) {
    if (isResetting) return;
    
    isResetting = true;
    updateResetButtonState('auto-reset');
    console.log(`자동 초기화 시작: ${reason}`);
    
    try {
        const studentsToReset = [];
        
        sheetData.forEach((data, hakbun) => {
            if (!RESET_EXCEPTIONS.includes(data.location)) {
                studentsToReset.push(hakbun);
            }
        });

        if (studentsToReset.length === 0) {
            console.log('초기화할 학생이 없습니다.');
            localStorage.setItem('lastResetDate', dateString);
            updateResetButtonState('idle');
            return;
        }

        for (const hakbun of studentsToReset) {
            try {
                const response = await fetch(`${API_URL}?action=update&hakbun=${hakbun}&location=&reason=`);
                const result = await response.json();
                if (result.success) {
                    sheetData.delete(hakbun);
                } else {
                    console.error(`Failed to auto-reset student ${hakbun}:`, result.error);
                }
            } catch (error) {
                console.error(`Error auto-resetting student ${hakbun}:`, error);
            }
            
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        updateAllUI();
        console.log(`자동 초기화 완료: ${studentsToReset.length}명 초기화됨`);
        
        // 자동 초기화 완료 표시
        showAutoResetNotification(reason, studentsToReset.length);
        
        localStorage.setItem('lastResetDate', dateString);
        setTimeout(syncData, 1000);
        
    } catch (error) {
        console.error("Auto Reset Error:", error);
        updateResetButtonState('error');
    } finally {
        isResetting = false;
    }
}

// 초기화 관련 정보 주기적 업데이트
function startResetStatusUpdate() {
    updateAutoResetStatus();
    // 1분마다 상태 업데이트
    setInterval(updateAutoResetStatus, 60000);
}

// DOMContentLoaded 이벤트에 추가할 내용
document.addEventListener('DOMContentLoaded', () => {
    // 기존 초기화 코드들...
    
    // 초기화 버튼 상태 관리 시작
    updateResetButtonState('idle');
    startResetStatusUpdate();
    
    // 키보드 단축키 추가 (Ctrl + R로 초기화)
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'r' && !isResetting) {
            e.preventDefault();
            resetAfterSchool();
        }
    });
});

// 전역 함수로 상태 확인 함수 추가
window.resetButtonState = {
    getState: () => {
        const resetBtn = document.querySelector('.reset-btn');
        if (!resetBtn) return 'unknown';
        
        if (resetBtn.classList.contains('resetting')) return 'resetting';
        if (resetBtn.classList.contains('success')) return 'success';
        if (resetBtn.classList.contains('error')) return 'error';
        return 'idle';
    },
    updateState: updateResetButtonState
};

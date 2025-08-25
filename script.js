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
        const etcClasses = ["보건실", "과학실", "201", "202", "203", "디지털 컨텐츠실", "회계실습실", "302호", "303호", "304호", "306호", "307호", "휴머노이드", "다목적 실습", "it 실습", "크스실", "kt 실", "3D애니메이션제작실습실", "앱창작실", "음악실", "교무실", "멀티미디어실", "비즈쿨실", "방송실", "시청각실", "결석", "조기 입실", "소풍", "금요귀가"];

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

            // 공휴일 체크 (간단한 예시 - 실제로는 더 정확한 공휴일 데이터가 필요)
            const isHoliday = false; // 실제 공휴일 체크 로직 추가 필요

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

        function initializeSeats() {
            seatGrid.innerHTML = '';
            const activeStudents = students.filter(s => s.hakbun !== GHOST_STUDENT_HAKBUN);
            
            activeStudents.forEach((student, index) => {
                // 서가별(index 12)과 신수안(index 13)은 연속으로 배치
                // 신수안(index 13) 다음에 빈 공간 추가
                // 이건우(index 14)부터는 한 칸씩 밀어서 배치
                let actualIndex = index;
                if (index >= 14) { // 이건우부터
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
                
                // 신수안(index 13) 다음에 빈 공간 추가
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


        function updateRightPanel() {
            classPanel.innerHTML = '';
            const groups = new Map();
            sheetData.forEach((data, hakbun) => {
                const student = students.find(s => s.hakbun === hakbun);
                if (!student) return;
                const groupName = etcClasses.includes(data.location) ? '기타' : data.location;
                if (!groups.has(groupName)) groups.set(groupName, []);
                groups.get(groupName).push({ student, data });
            });
            
            groups.forEach((list, groupName) => {
                const groupEl = document.createElement('div');
                groupEl.className = 'group';
                const chipsHTML = list.map(item => {
                    if (groupName === '기타') {
                        return `<div class="chip"><span>${item.student.name}</span><small>(${item.data.location})</small></div>`;
                    } else {
                        return `<div class="chip"><span>${item.student.name}</span></div>`;
                    }
                }).join('');
                groupEl.innerHTML = `<div class="ghead"><div>${groupName}</div><div class="badge">${list.length}명</div></div><div class="chips">${chipsHTML}</div>`;
                classPanel.appendChild(groupEl);
            });
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
                        <div class="dday-title">${item.title}</div>
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
            
            // 날짜순 정렬
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
                        <div class="assessment-subject">${item.subject}</div>
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
                
                // 초기화 대상 찾기 (외출, 결석, 금요귀가, 소풍 제외)
                sheetData.forEach((data, hakbun) => {
                    const keepLocations = ['외출', '결석', '금요귀가', '소풍'];
                    if (!keepLocations.includes(data.location)) {
                        studentsToReset.push(hakbun);
                    }
                });

                // 각 학생을 개별적으로 초기화
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
                    
                    // 요청 간 짧은 지연
                    await new Promise(resolve => setTimeout(resolve, 100));
                }

                updateAllUI();
                alert(`${studentsToReset.length}명의 학생이 초기화되었습니다.`);
                
                // 초기화 후 서버 데이터와 동기화
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
        // 여기에 경로만 추가하면 자동 순환
        ];

        let galleryIndex = 0;
        let galleryTimer = null;

        // 내부 상태: 더블 버퍼 레이어
        let layerA = null;
        let layerB = null;
        let activeLayerKey = 'A';

        function ensureLayers() {
        const wrapper = document.getElementById('galleryWrapper');
        if (!wrapper) return false;

        // 이미 만들어졌으면 스킵
        if (layerA && layerB) return true;

        // 두 개의 <img> 레이어를 동적으로 추가 (HTML 수정 불필요)
        layerA = document.createElement('img');
        layerA.id = 'galleryLayerA';
        layerA.className = 'gallery-layer is-active';

        layerB = document.createElement('img');
        layerB.id = 'galleryLayerB';
        layerB.className = 'gallery-layer';

        // 내비/인디케이터보다 뒤에 오도록 가장 앞에 삽입
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

        // 이미지가 로드된 후에 페이드 시작 (플래시 방지)
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
        // 첫 렌더: 레이어 생성 + 초기 이미지 세팅
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
            // 컨트롤 표시/숨김
            wrapper.querySelectorAll('.gallery-nav').forEach(btn => {
            btn.style.display = showControls ? 'block' : 'none';
            });
            const indicators = document.getElementById('galleryIndicators');
            if (indicators) {
            indicators.style.display = showControls ? 'flex' : 'none';
            if (showControls) createIndicators();
            }

            // 호버 시 자동재생 일시정지/재개
            wrapper.addEventListener('mouseenter', () => { if (galleryTimer) clearInterval(galleryTimer); });
            wrapper.addEventListener('mouseleave', startGalleryTimer);
        }

        ensureLayers();
        preloadGallery();
        renderGallery();
        startGalleryTimer();
        }

        window.addEventListener('DOMContentLoaded', initGallery);

        // HTML onclick에서 호출
        window.nextImage = nextImage;
        window.prevImage = prevImage;


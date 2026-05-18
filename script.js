/* ==========================================================================
   GradeFlow Application Logic
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  
  // --------------------------------------------------------------------------
  // A. State & Initial Data
  // --------------------------------------------------------------------------
  
  // Default mock subject list for high school grade tracking
  const DEFAULT_SUBJECTS = [
    { id: 'sub-1', name: '국어', units: 4, rank: 28, sameRank: 1, total: 250 },     // 11.20% -> 3등급
    { id: 'sub-2', name: '수학Ⅰ', units: 4, rank: 125, sameRank: 1, total: 250 },  // 50.00% -> 5등급
    { id: 'sub-3', name: '영어Ⅰ', units: 4, rank: 102, sameRank: 1, total: 250 },  // 40.80% -> 5등급
    { id: 'sub-4', name: '한국사', units: 2, rank: 9, sameRank: 1, total: 250 },     // 3.60% -> 1등급
    { id: 'sub-5', name: '통합과학', units: 3, rank: 166, sameRank: 3, total: 250 }  // 66.80% -> 6등급
  ];

  let subjects = [];

  // Load from local storage or set defaults
  function initData() {
    const saved = localStorage.getItem('gradeflow_subjects');
    if (saved) {
      try {
        subjects = JSON.parse(saved);
      } catch (e) {
        subjects = [...DEFAULT_SUBJECTS];
      }
    } else {
      subjects = [...DEFAULT_SUBJECTS];
      saveSubjects();
    }
  }

  function saveSubjects() {
    localStorage.setItem('gradeflow_subjects', JSON.stringify(subjects));
  }

  // --------------------------------------------------------------------------
  // B. Elements Selection
  // --------------------------------------------------------------------------
  
  // Theme & Tabs
  const themeToggle = document.getElementById('theme-toggle');
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');
  
  // Evaluator Type Switches
  const evalRelative = document.getElementById('eval-relative');
  const evalAbsolute = document.getElementById('eval-absolute');
  const relativeInputGroup = document.getElementById('relative-input-group');
  const absoluteInputGroup = document.getElementById('absolute-input-group');

  // Quick Calculator Inputs
  const inputRank = document.getElementById('input-rank');
  const inputSameRank = document.getElementById('input-same-rank');
  const inputTotal = document.getElementById('input-total');
  const inputScore = document.getElementById('input-score');
  const absTypeSelect = document.getElementById('abs-type-select');

  // Quick Calculator Result Displays
  const resultGradeCircle = document.getElementById('result-grade-circle');
  const resultGradeValue = document.getElementById('result-grade-value');
  const resultGradeLabel = document.getElementById('result-grade-label');
  const resultPercentageBadge = document.getElementById('result-percentage-badge');
  const resultCalcDetails = document.getElementById('result-calc-details');
  const btnAddToTracker = document.getElementById('btn-add-to-tracker');

  // GPA Summary
  const overallGpaDisp = document.getElementById('overall-gpa');
  const gpaMetaTextDisp = document.getElementById('gpa-meta-text');

  // Tracker Form & Table
  const addSubjectForm = document.getElementById('add-subject-form');
  const subNameInput = document.getElementById('sub-name');
  const subUnitsInput = document.getElementById('sub-units');
  const subRankInput = document.getElementById('sub-rank');
  const subSameRankInput = document.getElementById('sub-same-rank');
  const subTotalInput = document.getElementById('sub-total');
  
  const subjectListTbody = document.getElementById('subject-list-tbody');
  const listEmptyState = document.getElementById('list-empty-state');
  const btnClearAll = document.getElementById('btn-clear-all');

  // --------------------------------------------------------------------------
  // C. Theme Toggle Logic
  // --------------------------------------------------------------------------
  
  // Initialize Theme
  const savedTheme = localStorage.getItem('gradeflow_theme') || 'dark';
  if (savedTheme === 'light') {
    document.body.classList.remove('dark-theme');
    document.body.classList.add('light-theme');
  } else {
    document.body.classList.add('dark-theme');
    document.body.classList.remove('light-theme');
  }

  themeToggle.addEventListener('click', () => {
    if (document.body.classList.contains('dark-theme')) {
      document.body.classList.remove('dark-theme');
      document.body.classList.add('light-theme');
      localStorage.setItem('gradeflow_theme', 'light');
    } else {
      document.body.classList.remove('light-theme');
      document.body.classList.add('dark-theme');
      localStorage.setItem('gradeflow_theme', 'dark');
    }
    // Redraw graph to align with new grid lines
    calculateQuickGrade();
  });

  // --------------------------------------------------------------------------
  // D. Tab Switcher
  // --------------------------------------------------------------------------
  
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove active from all btns and panes
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));

      // Add active to selected
      btn.classList.add('active');
      const tabId = btn.getAttribute('data-tab');
      document.getElementById(tabId).classList.add('active');
    });
  });

  // --------------------------------------------------------------------------
  // E. Grading Algorithms
  // --------------------------------------------------------------------------
  
  /**
   * Calculates the relative grade (1 to 9) based on percentage.
   * @param {number} pct - Cumulative percentage (0 to 100)
   * @returns {number} Relative grade (1-9)
   */
  function getRelativeGrade(pct) {
    if (pct <= 4.0) return 1;
    if (pct <= 11.0) return 2;
    if (pct <= 23.0) return 3;
    if (pct <= 40.0) return 4;
    if (pct <= 60.0) return 5;
    if (pct <= 77.0) return 6;
    if (pct <= 89.0) return 7;
    if (pct <= 96.0) return 8;
    return 9;
  }

  /**
   * Calculates the intermediate rank & percentage.
   */
  function calculatePercentage(rank, sameRank, total) {
    const interRank = rank + (sameRank - 1) / 2;
    const pct = (interRank / total) * 100;
    return {
      intermediateRank: interRank,
      percentage: Math.min(100, Math.max(0, pct))
    };
  }

  /**
   * Calculates absolute grade.
   * @param {number} score - Score (0 to 100)
   * @param {string} system - 'middle' (A-E) or 'high-career' (A-C)
   * @returns {string} Grade alphabet
   */
  function getAbsoluteGrade(score, system) {
    if (system === 'middle') {
      if (score >= 90) return 'A';
      if (score >= 80) return 'B';
      if (score >= 70) return 'C';
      if (score >= 60) return 'D';
      return 'E';
    } else { // high-career
      if (score >= 80) return 'A';
      if (score >= 60) return 'B';
      return 'C';
    }
  }

  // --------------------------------------------------------------------------
  // F. Normal Distribution Bell Curve Drawing (SVG)
  // --------------------------------------------------------------------------
  
  /**
   * Standard Normal Cumulative Distribution Function (CDF) Approximation (for graphing)
   */
  function normalCDF(x) {
    // Math approximation of Phi(x)
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp(-x * x / 2);
    const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    if (x > 0) return 1 - prob;
    return prob;
  }

  /**
   * Inverse Normal Cumulative Distribution (Probit approximation)
   * Maps a cumulative probability (0 to 1) to a z-score (-3 to 3)
   */
  function probit(p) {
    if (p <= 0.0001) return -3.0;
    if (p >= 0.9999) return 3.0;
    
    // Probit approximation formula
    const c0 = 2.515517, c1 = 0.802853, c2 = 0.010328;
    const d1 = 1.432788, d2 = 0.189269, d3 = 0.001308;
    
    const isBelowHalf = p < 0.5;
    const q = isBelowHalf ? p : 1 - p;
    
    const t = Math.sqrt(-2 * Math.log(q));
    let z = t - ((c2 * t + c1) * t + c0) / (((d3 * t + d2) * t + d1) * t + 1.0);
    
    return isBelowHalf ? -z : z;
  }

  /**
   * Draw the visual bell curve showing the student's grade standing.
   * @param {number} percentage - The student's top cumulative percentile (0% to 100%)
   */
  function drawBellCurve(percentage) {
    const svg = document.getElementById('bell-curve-svg');
    if (!svg) return;
    
    // Clear previous elements
    svg.innerHTML = '';

    // Define gradients in SVG
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    
    // Gradient for the shaded active region (indigo/teal)
    const activeGrad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    activeGrad.setAttribute('id', 'bell-grad-active');
    activeGrad.setAttribute('x1', '0%');
    activeGrad.setAttribute('y1', '0%');
    activeGrad.setAttribute('x2', '100%');
    activeGrad.setAttribute('y2', '0%');
    
    const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop1.setAttribute('offset', '0%');
    stop1.setAttribute('stop-color', 'var(--accent-cyan)');
    stop1.setAttribute('stop-opacity', '0.65');
    
    const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop2.setAttribute('offset', '100%');
    stop2.setAttribute('stop-color', 'var(--primary)');
    stop2.setAttribute('stop-opacity', '0.4');
    
    activeGrad.appendChild(stop1);
    activeGrad.appendChild(stop2);
    defs.appendChild(activeGrad);
    svg.appendChild(defs);

    // Graph plotting dimensions
    const width = 500;
    const height = 220;
    const paddingX = 40;
    const paddingY = 40;
    
    const plotWidth = width - paddingX * 2;
    const plotHeight = height - paddingY * 2;
    const axisY = height - paddingY; // bottom baseline Y-coordinate (180)
    
    // Normal curve equation helper
    function getSvgCoords(z) {
      // z is standard z-score from -3.0 to +3.0
      // Map z [-3.0, 3.0] to X [paddingX, width - paddingX]
      const xCoord = paddingX + ((z + 3) / 6) * plotWidth;
      
      // y = e^(-z^2/2) / sqrt(2*pi)
      const yVal = Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI);
      // Map y [0, 0.4] to Y [axisY, paddingY]
      const yCoord = axisY - (yVal / 0.4) * plotHeight;
      
      return { x: xCoord, y: yCoord };
    }

    // 1. Draw cutoffs grid lines for standard relative grades
    // 1등급 (4%), 2등급 (11%), 3등급 (23%), 4등급 (40%), 5등급 (60%), 7등급 (89%)
    const cutoffs = [
      { pct: 4, label: '4%', z: probit(0.04), text: '1등급' },
      { pct: 11, label: '11%', z: probit(0.11), text: '2등급' },
      { pct: 23, label: '23%', z: probit(0.23), text: '3등급' },
      { pct: 40, label: '40%', z: probit(0.40), text: '4등급' },
      { pct: 60, label: '60%', z: probit(0.60), text: '5등급' },
      { pct: 77, label: '77%', z: probit(0.77), text: '6등급' },
      { pct: 89, label: '89%', z: probit(0.89), text: '7등급' }
    ];

    // 2. Plot the main Bell Curve line points
    let points = [];
    const steps = 100;
    for (let i = 0; i <= steps; i++) {
      const z = -3.0 + (i / steps) * 6.0;
      points.push(getSvgCoords(z));
    }

    // Path string for the bell curve
    let curvePathD = `M ${points[0].x} ${axisY} `;
    points.forEach(pt => {
      curvePathD += `L ${pt.x} ${pt.y} `;
    });
    curvePathD += `L ${points[points.length - 1].x} ${axisY} Z`;

    // 3. Shaded Active Region
    // Student's score percentage translates into an area starting from the left (0%) up to the student's percentile.
    // However, top rank (0%) is at the LEFT end (best), so we shade from left (z = -3) to the student's z-score.
    const studentZ = probit(percentage / 100);
    const studentCoords = getSvgCoords(studentZ);

    let activePoints = [];
    for (let i = 0; i <= steps; i++) {
      const z = -3.0 + (i / steps) * 6.0;
      if (z <= studentZ) {
        activePoints.push(getSvgCoords(z));
      } else {
        break;
      }
    }
    activePoints.push(studentCoords); // end at exact student coordinate

    if (activePoints.length > 1) {
      let activePathD = `M ${activePoints[0].x} ${axisY} `;
      activePoints.forEach(pt => {
        activePathD += `L ${pt.x} ${pt.y} `;
      });
      activePathD += `L ${studentCoords.x} ${axisY} Z`;

      const activeZone = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      activeZone.setAttribute('d', activePathD);
      activeZone.setAttribute('class', 'curve-fill-zone');
      svg.appendChild(activeZone);
    }

    // 4. Draw Cutoff Grid Lines & labels
    cutoffs.forEach(cutoff => {
      const coords = getSvgCoords(cutoff.z);
      
      // Grid line
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', coords.x);
      line.setAttribute('y1', axisY);
      line.setAttribute('x2', coords.x);
      line.setAttribute('y2', coords.y);
      line.setAttribute('class', 'curve-grid-line');
      svg.appendChild(line);

      // Label at the bottom
      const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      txt.setAttribute('x', coords.x);
      txt.setAttribute('y', axisY + 16);
      txt.setAttribute('class', 'graph-label-text');
      txt.textContent = cutoff.label;
      svg.appendChild(txt);
    });

    // 5. Draw the entire background curve line on top
    const curveLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    curveLine.setAttribute('d', curvePathD.replace(' Z', '')); // only line, no bottom closure
    curveLine.setAttribute('class', 'curve-line');
    svg.appendChild(curveLine);

    // 6. Draw X-Axis Baseline
    const baseline = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    baseline.setAttribute('x1', paddingX - 10);
    baseline.setAttribute('y1', axisY);
    baseline.setAttribute('x2', width - paddingX + 10);
    baseline.setAttribute('y2', axisY);
    baseline.setAttribute('stroke', 'var(--border-color)');
    baseline.setAttribute('stroke-width', '1.5');
    svg.appendChild(baseline);

    // 7. Draw Student Current Position Pulse & Marker
    // Vertical marker line
    const markerLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    markerLine.setAttribute('x1', studentCoords.x);
    markerLine.setAttribute('y1', axisY);
    markerLine.setAttribute('x2', studentCoords.x);
    markerLine.setAttribute('y2', studentCoords.y);
    markerLine.setAttribute('class', 'marker-line');
    svg.appendChild(markerLine);

    // Pulsing outer ring
    const pulseCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    pulseCircle.setAttribute('cx', studentCoords.x);
    pulseCircle.setAttribute('cy', studentCoords.y);
    pulseCircle.setAttribute('r', '10');
    pulseCircle.setAttribute('class', 'marker-pulse');
    // Align SVG transforms for CSS animation scaling (scale from center)
    pulseCircle.style.transformOrigin = `${studentCoords.x}px ${studentCoords.y}px`;
    svg.appendChild(pulseCircle);

    // Solid inner circle
    const markerCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    markerCircle.setAttribute('cx', studentCoords.x);
    markerCircle.setAttribute('cy', studentCoords.y);
    markerCircle.setAttribute('r', '5.5');
    markerCircle.setAttribute('class', 'marker-circle');
    svg.appendChild(markerCircle);

    // Current Percentage Text Bubble / Label
    const textGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    
    // Bubble box dimensions
    const bubbleW = 60;
    const bubbleH = 18;
    const bubbleX = Math.max(paddingX - 10, Math.min(width - paddingX - bubbleW + 10, studentCoords.x - bubbleW / 2));
    const bubbleY = studentCoords.y - 28;

    const bubbleRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bubbleRect.setAttribute('x', bubbleX);
    bubbleRect.setAttribute('y', bubbleY);
    bubbleRect.setAttribute('width', bubbleW);
    bubbleRect.setAttribute('height', bubbleH);
    bubbleRect.setAttribute('rx', '4');
    bubbleRect.setAttribute('fill', 'var(--primary)');
    bubbleRect.setAttribute('filter', 'drop-shadow(0 2px 5px rgba(0,0,0,0.2))');
    textGroup.appendChild(bubbleRect);

    const bubbleText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    bubbleText.setAttribute('x', bubbleX + bubbleW / 2);
    bubbleText.setAttribute('y', bubbleY + 12);
    bubbleText.setAttribute('fill', '#ffffff');
    bubbleText.setAttribute('font-size', '9px');
    bubbleText.setAttribute('font-weight', '700');
    bubbleText.setAttribute('text-anchor', 'middle');
    bubbleText.textContent = `상위 ${percentage.toFixed(2)}%`;
    textGroup.appendChild(bubbleText);

    svg.appendChild(textGroup);
  }

  // --------------------------------------------------------------------------
  // G. Live Evaluation & Rendering
  // --------------------------------------------------------------------------
  
  // Tab Switch listener for evaluated values
  const relativeRadio = document.getElementById('eval-relative');
  const absoluteRadio = document.getElementById('eval-absolute');

  function handleEvalTypeChange() {
    if (relativeRadio.checked) {
      relativeInputGroup.classList.add('active');
      absoluteInputGroup.classList.remove('active');
    } else {
      relativeInputGroup.classList.remove('active');
      absoluteInputGroup.classList.add('active');
    }
    calculateQuickGrade();
  }

  [relativeRadio, absoluteRadio].forEach(radio => {
    radio.addEventListener('change', handleEvalTypeChange);
  });

  // Calculate Quick Grade
  function calculateQuickGrade() {
    const isRelative = relativeRadio.checked;
    
    // Reset grade circle classes
    resultGradeCircle.className = 'grade-circle';

    if (isRelative) {
      const rank = parseInt(inputRank.value) || 1;
      const sameRank = parseInt(inputSameRank.value) || 1;
      const total = parseInt(inputTotal.value) || 100;

      if (rank > total) {
        inputRank.value = total;
      }

      const { intermediateRank, percentage } = calculatePercentage(rank, sameRank, total);
      const grade = getRelativeGrade(percentage);

      // Colorize circle
      resultGradeCircle.classList.add(`bg-g${grade}`);

      // Set displays
      resultGradeValue.textContent = grade;
      resultGradeLabel.textContent = '등급';
      resultPercentageBadge.textContent = `상위 ${percentage.toFixed(2)}%`;
      resultPercentageBadge.style.background = 'var(--accent-grad-cyan)';

      let sameRankText = sameRank > 1 ? `동석차 ${sameRank}명 반영` : '단독 석차';
      resultCalcDetails.innerHTML = `
        중간석차: <strong>${intermediateRank.toFixed(1)}등</strong> (${sameRankText})<br>
        전체 ${total}명 중 상위 <strong>${percentage.toFixed(2)}%</strong>에 해당하며, 고등학교 기준 <strong>${grade}등급</strong>에 속합니다.
      `;

      // Render Bell Curve
      drawBellCurve(percentage);

    } else {
      // Absolute Evaluation
      const score = Math.max(0, Math.min(100, parseInt(inputScore.value) || 0));
      const system = absTypeSelect.value;
      const grade = getAbsoluteGrade(score, system);

      // Class mappings to mimic relative grade color style
      let colorClass = 'bg-g5'; // Blue by default
      if (grade === 'A') colorClass = 'bg-g1'; // Gold
      else if (grade === 'B') colorClass = 'bg-g2'; // Silver
      else if (grade === 'C') colorClass = 'bg-g3'; // Bronze
      else if (grade === 'D') colorClass = 'bg-g4'; // Cyan
      else if (grade === 'E') colorClass = 'bg-g8'; // Gray
      
      resultGradeCircle.classList.add(colorClass);

      resultGradeValue.textContent = grade;
      resultGradeLabel.textContent = '성취도';
      resultPercentageBadge.textContent = `${score}점 / 100점`;
      resultPercentageBadge.style.background = 'var(--accent-grad-teal)';

      let systemName = system === 'middle' ? '중학교 절대평가' : '고등학교 진로선택과목';
      resultCalcDetails.innerHTML = `
        원점수 <strong>${score}점</strong>을 취득하여,<br>
        ${systemName} 평가 기준에 따라 성취도 <strong>${grade}</strong>를 받았습니다.
      `;

      // For absolute evaluation, z-score maps percentage to equivalent score (e.g. 100점 = 0%, 0점 = 100%)
      // This allows the curve indicator to visually move as the score increases!
      const scorePercentage = 100 - score;
      drawBellCurve(scorePercentage);
    }
  }

  // Quick inputs event listeners
  [inputRank, inputSameRank, inputTotal, inputScore, absTypeSelect].forEach(element => {
    element.addEventListener('input', calculateQuickGrade);
    element.addEventListener('change', calculateQuickGrade);
  });

  // --------------------------------------------------------------------------
  // H. Subject Tracker Operations
  // --------------------------------------------------------------------------

  // Render subject list in the tracker tab
  function renderSubjectList() {
    subjectListTbody.innerHTML = '';
    
    if (subjects.length === 0) {
      listEmptyState.style.display = 'flex';
      subjectListTbody.parentElement.style.display = 'none';
      overallGpaDisp.textContent = '-.--';
      gpaMetaTextDisp.textContent = '등록된 과목이 없습니다.';
      return;
    }

    listEmptyState.style.display = 'none';
    subjectListTbody.parentElement.style.display = 'table';

    let totalUnits = 0;
    let weightedGradeSum = 0;

    subjects.forEach((sub, index) => {
      const { percentage } = calculatePercentage(sub.rank, sub.sameRank, sub.total);
      const grade = getRelativeGrade(percentage);

      totalUnits += sub.units;
      weightedGradeSum += (grade * sub.units);

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${sub.name}</strong></td>
        <td><span class="badge-units">${sub.units}단위</span></td>
        <td>${sub.rank}등 / ${sub.total}명 ${sub.sameRank > 1 ? `<small>(동석차 ${sub.sameRank}명)</small>` : ''}</td>
        <td><span class="percentage-text">${percentage.toFixed(1)}%</span></td>
        <td><span class="badge-grade bg-g${grade}">${grade}</span></td>
        <td>
          <button class="btn-icon" data-id="${sub.id}" title="과목 삭제">
            <i data-lucide="trash-2" style="width: 15px; height: 15px;"></i>
          </button>
        </td>
      `;
      subjectListTbody.appendChild(tr);
    });

    // Re-initialize Lucide Icons on newly rendered table buttons
    lucide.createIcons();

    // Calculate overall GPA
    const overallGpa = weightedGradeSum / totalUnits;
    overallGpaDisp.textContent = overallGpa.toFixed(2);
    gpaMetaTextDisp.textContent = `총 ${subjects.length}개 과목 (${totalUnits}단위) 분석됨`;

    // Add delete event listeners
    const deleteBtns = subjectListTbody.querySelectorAll('.btn-icon');
    deleteBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = btn.getAttribute('data-id');
        deleteSubject(id);
      });
    });
  }

  // Add Subject
  function addSubject(name, units, rank, sameRank, total) {
    const newSub = {
      id: 'sub-' + Date.now(),
      name,
      units: parseInt(units),
      rank: parseInt(rank),
      sameRank: parseInt(sameRank) || 1,
      total: parseInt(total)
    };

    subjects.push(newSub);
    saveSubjects();
    renderSubjectList();
  }

  // Delete Subject
  function deleteSubject(id) {
    subjects = subjects.filter(sub => sub.id !== id);
    saveSubjects();
    renderSubjectList();
  }

  // Form submission handler
  addSubjectForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const name = subNameInput.value.trim();
    const units = parseInt(subUnitsInput.value);
    const rank = parseInt(subRankInput.value);
    const sameRank = parseInt(subSameRankInput.value) || 1;
    const total = parseInt(subTotalInput.value);

    if (rank > total) {
      alert('석차는 이수자 수보다 클 수 없습니다.');
      return;
    }

    addSubject(name, units, rank, sameRank, total);
    
    // Reset Form
    addSubjectForm.reset();
    subSameRankInput.value = 1;
    
    // Switch to tracker tab to show the added item
    const trackerTabBtn = document.querySelector('.tab-btn[data-tab="subject-tracker"]');
    if (trackerTabBtn) trackerTabBtn.click();
  });

  // Add current quick calculator result to tracker
  btnAddToTracker.addEventListener('click', () => {
    const isRelative = relativeRadio.checked;
    
    if (!isRelative) {
      alert('절대평가 성취도는 가중 평균 등급(상대평가 9등급제)에 포함될 수 없습니다. 상대평가 모드에서 추가해 주세요.');
      return;
    }

    const rank = parseInt(inputRank.value) || 1;
    const sameRank = parseInt(inputSameRank.value) || 1;
    const total = parseInt(inputTotal.value) || 100;
    
    // Prompt user for Subject Name & Units
    const defaultName = `추가과목_${subjects.length + 1}`;
    const name = prompt('추가할 과목명을 입력하세요:', defaultName);
    if (name === null) return; // cancelled
    
    const unitsStr = prompt('이수 단위수를 입력하세요 (1~10):', '3');
    if (unitsStr === null) return;
    const units = parseInt(unitsStr) || 3;

    addSubject(name || defaultName, units, rank, sameRank, total);

    // Switch to tracker tab
    const trackerTabBtn = document.querySelector('.tab-btn[data-tab="subject-tracker"]');
    if (trackerTabBtn) trackerTabBtn.click();
  });

  // Clear All subjects
  btnClearAll.addEventListener('click', () => {
    if (confirm('등록된 모든 과목을 삭제하시겠습니까?')) {
      subjects = [];
      saveSubjects();
      renderSubjectList();
    }
  });

  // --------------------------------------------------------------------------
  // I. Application Launch
  // --------------------------------------------------------------------------
  
  // 1. Initial Data load
  initData();
  
  // 2. Compute Initial displays & curve
  calculateQuickGrade();
  renderSubjectList();
  
  // 3. Initialize Lucide Icon renderer
  lucide.createIcons();

});

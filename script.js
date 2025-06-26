// script.js

// State management
let students = [];

// Constants for default percentages
const DEFAULT_EVALUATION_PERCENTAGE = 20;
const DEFAULT_TALLER_PERCENTAGE = 10;
const DEFAULT_CUADERNO_PERCENTAGE = 10; // Changed to match Taller percentage
const DEFAULT_RASGOS_PERCENTAGE = 10;    // Changed to match Taller percentage

// Helper to save/load from localStorage for basic persistence
const saveStudents = () => {
    localStorage.setItem('studentGradesApp', JSON.stringify(students));
};

const loadStudents = () => {
    const savedStudents = localStorage.getItem('studentGradesApp');
    if (savedStudents) {
        students = JSON.parse(savedStudents);
        // Ensure all evaluations have a type property for consistency and backward compatibility
        students.forEach(student => {
            if (!student.subject) { // New: Default subject for existing students
                student.subject = 'matematica';
            }
            if (!student.section) { // New: Default section for existing students
                student.section = 'A';
            }
            if (!student.year) { // New: Default year based on subject for existing students
                student.year = student.subject === 'matematica' ? '2do Año' : '3er Año';
            }
            if (!student.moment) { // NEW: Default moment for existing students
                student.moment = 'I';
            }
            student.evaluations.forEach(evaluation => {
                if (!evaluation.type) {
                    evaluation.type = 'evaluacion'; // Default value for old entries
                }
                // Also ensure weight is set if it's null (e.g., from old saves)
                // Or if we need to re-apply the default based on type because the input is gone
                if (evaluation.weight === null || evaluation.weight === undefined) {
                    switch (evaluation.type) {
                        case 'taller':
                            evaluation.weight = DEFAULT_TALLER_PERCENTAGE;
                            break;
                        case 'cuaderno':
                            evaluation.weight = DEFAULT_CUADERNO_PERCENTAGE;
                            break;
                        case 'rasgos':
                            evaluation.weight = DEFAULT_RASGOS_PERCENTAGE;
                            break;
                        case 'evaluacion':
                        default:
                            evaluation.weight = DEFAULT_EVALUATION_PERCENTAGE;
                            break;
                    }
                }
            });
        });
        renderApp();
    }
};

// DOM Elements
const studentNameInput = document.getElementById('studentNameInput');
const addStudentBtn = document.getElementById('addStudentBtn');
const studentsContainer = document.getElementById('studentsContainer');
const noStudentsMessage = document.getElementById('noStudentsMessage');

// --- Core Logic ---

/**
 * Calculates the final grade for a given student based on their evaluations.
 * This calculation sums the product of each grade and its corresponding percentage (converted to decimal).
 * For example, a grade of 80 with a 25% weight contributes 80 * (25/100) = 20 to the total.
 * The 'Nota Final' will be the sum of these contributions.
 * Note: For the 'Nota Final' to represent a score out of 100, the sum of all
 * percentages entered for a student's evaluations should ideally total 100.
 * @param {object} student - The student object with an 'evaluations' array.
 * @returns {number} The calculated final grade, or 0 if no evaluations.
 */
const calculateWeightedAverage = (student) => {
    if (!student.evaluations || student.evaluations.length === 0) {
        return 0;
    }

    let totalScoreContribution = 0; // Acumula la suma de (calificación * porcentaje/100) para cada evaluación

    student.evaluations.forEach(evaluation => {
        const grade = parseFloat(evaluation.grade);
        const weight = parseFloat(evaluation.weight); // User inputs percentage like 25 for 25%

        if (!isNaN(grade) && !isNaN(weight)) {
            // Multiplica la calificación por el porcentaje (convertido a decimal).
            // Este resultado se suma al 'totalScoreContribution'.
            totalScoreContribution += grade * (weight / 100);
        }
    });

    // La nota final es la suma de estas contribuciones ponderadas.
    // Si la suma de los porcentajes de las evaluaciones es 100, este valor será un promedio sobre 100.
    return totalScoreContribution.toFixed(2);
};

/**
 * Renders a single student card to the DOM or updates an existing one.
 * @param {object} student - The student data object.
 * @param {number} index - The index of the student in the 'students' array.
 */
const renderStudentCard = (student, index) => {
    let studentCard = document.getElementById(`student-card-${index}`);

    if (!studentCard) {
        studentCard = document.createElement('div');
        studentCard.className = 'student-card';
        studentCard.id = `student-card-${index}`;
        studentsContainer.appendChild(studentCard);
    }

    // Determine the year display based on the student's subject
    const yearDisplay = student.subject === 'matematica' ? '2do Año' : '3er Año';

    // Prepare counts for enumeration for all types
    const evaluationCounts = {
        'taller': 0,
        'evaluacion': 0,
        'cuaderno': 0,
        'rasgos': 0
    };

    const evaluationsHtml = student.evaluations.map((evaluation, evalIndex) => {
        // Increment count for the current evaluation type
        evaluationCounts[evaluation.type]++;
        let displayLabel;
        let displayCount = ''; // Initialize as empty for types that don't need enumeration

        switch (evaluation.type) {
            case 'taller':
                displayLabel = 'Taller';
                displayCount = ` ${evaluationCounts[evaluation.type]}`; // Enumerate taller
                break;
            case 'cuaderno':
                displayLabel = 'Cuaderno';
                // Do not enumerate 'Cuaderno'
                break;
            case 'rasgos':
                displayLabel = 'Rasgos';
                // Do not enumerate 'Rasgos'
                break;
            case 'evaluacion':
            default:
                displayLabel = 'Examen';
                displayCount = ` ${evaluationCounts[evaluation.type]}`; // Enumerate evaluacion
                break;
        }

        // Determine placeholder text for grade input
        let gradePlaceholder = 'Nota'; // Default placeholder
        if (evaluation.type === 'evaluacion' || evaluation.type === 'taller') {
            gradePlaceholder = 'N/P';
        } else if (evaluation.type === 'cuaderno') {
            gradePlaceholder = 'N/E';
        }

        return `
            <div class="evaluation-item">
                <div class="evaluation-header-group">
                    <span class="evaluation-number">${displayLabel}${displayCount} (${evaluation.weight}%)</span>
                    <div class="evaluation-controls"> <!-- New wrapper for controls -->
                        <select class="evaluation-type-select"
                                data-student-index="${index}"
                                data-evaluation-index="${evalIndex}"
                                aria-label="Tipo de evaluación">
                            <option value="evaluacion" ${evaluation.type === 'evaluacion' ? 'selected' : ''}>Examen</option>
                            <option value="taller" ${evaluation.type === 'taller' ? 'selected' : ''}>Taller</option>
                            <option value="cuaderno" ${evaluation.type === 'cuaderno' ? 'selected' : ''}>Cuaderno</option>
                            <option value="rasgos" ${evaluation.type === 'rasgos' ? 'selected' : ''}>Rasgos</option>
                        </select>
                        <input type="number" id="grade-${index}-${evalIndex}"
                               value="${evaluation.grade !== null ? evaluation.grade : ''}"
                               placeholder="${gradePlaceholder}"
                               min="0" max="100" step="0.01"
                               data-student-index="${index}"
                               data-evaluation-index="${evalIndex}"
                               data-type="grade"
                               aria-label="Calificación">
                        <button class="delete-evaluation-btn"
                                data-student-index="${index}"
                                data-evaluation-index="${evalIndex}"
                                aria-label="Eliminar evaluación">X</button>
                    </div> <!-- End of evaluation-controls wrapper -->
                </div>
            </div>
        `;
    }).join('');

    const finalAverage = calculateWeightedAverage(student);
    const finalAverageNum = parseFloat(finalAverage);
    let statusHtml = '';

    // Determine and generate the grade status box HTML
    // Only show status if there are evaluations, otherwise 0.00 average from no evaluations is not a "reprobado"
    if (student.evaluations.length > 0) {
        if (finalAverageNum >= 1 && finalAverageNum <= 9.4) {
            statusHtml = '<span class="grade-status reprobado">Reprobado</span>';
        } else if (finalAverageNum >= 9.5 && finalAverageNum <= 20) {
            statusHtml = '<span class="grade-status aprobado">Aprobado</span>';
        }
    }

    studentCard.innerHTML = `
        <div class="student-card-header">
            <h3 class="student-name">${student.name}</h3>
            <button class="delete-student-btn" data-student-index="${index}">Eliminar Alumno</button>
        </div>
        <div class="student-card-controls">
            <select class="subject-select"
                    data-student-index="${index}"
                    aria-label="Materia del alumno">
                <option value="matematica" ${student.subject === 'matematica' ? 'selected' : ''}>Matemática</option>
                <option value="fisica" ${student.subject === 'fisica' ? 'selected' : ''}>Física</option>
            </select>
            <div class="year-section-group">
                <span class="year-display">${yearDisplay}</span>
                <select class="section-select"
                        data-student-index="${index}"
                        aria-label="Sección del alumno">
                    <option value="A" ${student.section === 'A' ? 'selected' : ''}>A</option>
                    <option value="B" ${student.section === 'B' ? 'selected' : ''}>B</option>
                    <option value="C" ${student.section === 'C' ? 'selected' : ''}>C</option>
                    <option value="D" ${student.section === 'D' ? 'selected' : ''}>D</option>
                </select>
            </div>
            <select class="moment-select"
                    data-student-index="${index}"
                    aria-label="Momento de evaluación">
                <option value="I" ${student.moment === 'I' ? 'selected' : ''}>I</option>
                <option value="II" ${student.moment === 'II' ? 'selected' : ''}>II</option>
                <option value="III" ${student.moment === 'III' ? 'selected' : ''}>III</option>
            </select>
        </div>
        <div class="evaluations-list" id="evaluations-list-${index}">
            ${evaluationsHtml || '<p>No hay evaluaciones añadidas.</p>'}
        </div>
        <div class="student-actions">
            <button class="add-evaluation-btn" data-student-index="${index}">Agregar Evaluación</button>
            <button class="print-student-summary-btn" data-student-index="${index}">Imprimir Resumen</button>
        </div>
        <p class="final-average">Nota Final: <span id="average-${index}">${finalAverage}</span>${statusHtml}</p>
    `;

    // Show/hide noStudentsMessage
    if (students.length === 0) {
        noStudentsMessage.style.display = 'block';
    } else {
        noStudentsMessage.style.display = 'none';
    }
};

/**
 * Renders the entire application UI based on the 'students' array.
 */
const renderApp = () => {
    studentsContainer.innerHTML = ''; // Clear existing content
    if (students.length === 0) {
        noStudentsMessage.style.display = 'block';
    } else {
        noStudentsMessage.style.display = 'none';
        students.forEach((student, index) => {
            renderStudentCard(student, index);
        });
    }
    saveStudents(); // Save state after rendering
};

/**
 * Generates and prints a summary of a student's grades.
 * @param {object} student - The student data object.
 * @param {number} studentIndex - The index of the student.
 */
const printStudentSummary = (student, studentIndex) => {
    const studentName = student.name;
    const finalAverage = calculateWeightedAverage(student);
    const finalAverageNum = parseFloat(finalAverage); // Convert to number for comparison
    const yearDisplay = student.subject === 'matematica' ? '2do Año' : '3er Año';

    let statusHtml = '';
    if (student.evaluations.length > 0) {
        if (finalAverageNum >= 1 && finalAverageNum <= 9.4) {
            statusHtml = '<span class="grade-status reprobado">Reprobado</span>';
        } else if (finalAverageNum >= 9.5 && finalAverageNum <= 20) {
            statusHtml = '<span class="grade-status aprobado">Aprobado</span>';
        }
    }

    // Prepare evaluation details for printing
    const evaluationCounts = {
        'taller': 0,
        'evaluacion': 0,
        'cuaderno': 0,
        'rasgos': 0
    };
    const evaluationsPrintHtml = student.evaluations.map(evaluation => {
        evaluationCounts[evaluation.type]++;
        let displayLabel;
        let displayCount = '';

        switch (evaluation.type) {
            case 'taller':
                displayLabel = 'Taller';
                displayCount = ` ${evaluationCounts[evaluation.type]}`;
                break;
            case 'cuaderno':
                displayLabel = 'Cuaderno';
                break;
            case 'rasgos':
                displayLabel = 'Rasgos';
                break;
            case 'evaluacion':
            default:
                displayLabel = 'Examen';
                displayCount = ` ${evaluationCounts[evaluation.type]}`;
                break;
        }

        // Determine grade display for printing
        let gradeDisplay = 'N/A'; // Default for any unspecified null grade
        if (evaluation.grade !== null) {
            gradeDisplay = evaluation.grade;
        } else {
            if (evaluation.type === 'evaluacion' || evaluation.type === 'taller') {
                gradeDisplay = 'N/P';
            } else if (evaluation.type === 'cuaderno') {
                gradeDisplay = 'N/E';
            }
            // For 'rasgos' it will remain 'N/A' if grade is null, as per prompt.
        }

        return `<p><strong>${displayLabel}${displayCount}:</strong> ${gradeDisplay} (${evaluation.weight}%)</p>`;
    }).join('');

    const printableContent = `
        <div class="print-summary-container">
            <h1>Resumen de Calificaciones</h1>
            <h2>Alumno: ${studentName}</h2>
            <p><strong>Materia:</strong> ${student.subject === 'matematica' ? 'Matemática' : 'Física'}</p>
            <p><strong>Año:</strong> ${yearDisplay}</p>
            <p><strong>Sección:</strong> ${student.section}</p>
            <p><strong>Momento:</strong> ${student.moment}</p>
            <h3>Evaluaciones:</h3>
            <div class="print-evaluations-list">
                ${evaluationsPrintHtml || '<p>No hay evaluaciones añadidas.</p>'}
            </div>
            <p class="print-final-average"><strong>Nota Final:</strong> ${finalAverage}${statusHtml}</p>
        </div>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Resumen de Calificaciones - ${studentName}</title>
            <link rel="stylesheet" href="style.css">
            <style>
                body {
                    margin: 0;
                    padding: 1rem;
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    color: #333;
                    background-color: white; /* Ensure white background for print */
                }
                .print-summary-container {
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 1rem;
                    /* No border or shadow needed for print */
                }
                .print-summary-container h1,
                .print-summary-container h2,
                .print-summary-container h3 {
                    text-align: center;
                    margin-bottom: 1rem;
                    color: #388E3C; /* Primary dark color */
                }
                .print-summary-container h1 { font-size: 2rem; }
                .print-summary-container h2 { font-size: 1.5rem; }
                .print-summary-container h3 { font-size: 1.2rem; margin-top: 1rem; }
                .print-summary-container p {
                    margin-bottom: 0.4rem;
                    font-size: 1rem;
                    line-height: 1.4;
                }
                .print-evaluations-list {
                    margin-top: 1rem;
                    margin-bottom: 1.5rem;
                    border-top: 1px dashed #ccc;
                    padding-top: 1rem;
                }
                .print-evaluations-list p {
                    margin-left: 1rem;
                    margin-bottom: 0.3rem;
                }
                .print-final-average {
                    font-size: 1.4rem; /* Make final average prominent */
                    font-weight: bold;
                    /* text-align: right; Remove as we use flexbox */
                    margin-top: 2rem;
                    padding-top: 1rem;
                    border-top: 1px solid #aaa;
                    display: flex; /* Use flexbox for alignment */
                    align-items: center; /* Vertically align items */
                    justify-content: flex-end; /* Align items to the right */
                    gap: 0.8rem; /* Space between the average and the status box */
                }
            </style>
        </head>
        <body>
            ${printableContent}
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
};

// --- Event Handlers ---

addStudentBtn.addEventListener('click', () => {
    const studentName = studentNameInput.value.trim();
    if (studentName) {
        students.push({
            name: studentName,
            evaluations: [],
            subject: 'matematica', // Default subject
            year: '2do Año',     // Default year for new students (based on default subject)
            section: 'A',         // Default section for new students
            moment: 'I'           // NEW: Default moment for new students
        });
        studentNameInput.value = ''; // Clear input
        renderApp();
    } else {
        alert('Por favor, ingresa el nombre del alumno.');
    }
});

// Using event delegation for dynamic elements within the studentsContainer
studentsContainer.addEventListener('click', (event) => {
    const target = event.target;

    // Add Evaluation
    if (target.classList.contains('add-evaluation-btn')) {
        const studentIndex = parseInt(target.dataset.studentIndex);
        if (!isNaN(studentIndex) && students[studentIndex]) {
            // Set default weight for new evaluations based on type (defaulting to 'evaluacion')
            students[studentIndex].evaluations.push({
                grade: null,
                weight: DEFAULT_EVALUATION_PERCENTAGE, // Default to 20% for 'evaluacion'
                type: 'evaluacion'
            });
            renderStudentCard(students[studentIndex], studentIndex); // Re-render just this student's card
            saveStudents();
        }
    }

    // Print Student Summary
    if (target.classList.contains('print-student-summary-btn')) {
        const studentIndex = parseInt(target.dataset.studentIndex);
        if (!isNaN(studentIndex) && students[studentIndex]) {
            printStudentSummary(students[studentIndex], studentIndex);
        }
    }

    // Delete Student
    if (target.classList.contains('delete-student-btn')) {
        const studentIndex = parseInt(target.dataset.studentIndex);
        if (!isNaN(studentIndex) && students[studentIndex] && confirm(`¿Estás seguro de que quieres eliminar a ${students[studentIndex].name}?`)) {
            students.splice(studentIndex, 1);
            renderApp(); // Re-render all students to correctly update indices and order
        }
    }

    // Delete Evaluation
    if (target.classList.contains('delete-evaluation-btn')) {
        const studentIndex = parseInt(target.dataset.studentIndex);
        const evaluationIndex = parseInt(target.dataset.evaluationIndex);
        if (!isNaN(studentIndex) && !isNaN(evaluationIndex) && students[studentIndex]) {
            students[studentIndex].evaluations.splice(evaluationIndex, 1);
            // Re-render the specific student card after evaluation deletion to update UI and average
            renderStudentCard(students[studentIndex], studentIndex);
            saveStudents();
        }
    }
});

studentsContainer.addEventListener('input', (event) => {
    const target = event.target;
    // Check if the input is one of our grade fields
    if (target.tagName === 'INPUT' && target.dataset.type === 'grade') {
        const studentIndex = parseInt(target.dataset.studentIndex);
        const evaluationIndex = parseInt(target.dataset.evaluationIndex);
        const type = target.dataset.type;
        let value = parseFloat(target.value);

        // Store as null if input is empty or not a valid number
        if (isNaN(value) || target.value.trim() === '') {
            value = null;
        }

        if (!isNaN(studentIndex) && !isNaN(evaluationIndex) && students[studentIndex]) {
            students[studentIndex].evaluations[evaluationIndex][type] = value;

            // Update only the average display for this student without re-rendering the whole card
            const averageSpan = document.getElementById(`average-${studentIndex}`);
            if (averageSpan) {
                const newAverage = calculateWeightedAverage(students[studentIndex]);
                averageSpan.textContent = newAverage;

                // Also update the status box next to the average
                let statusHtml = '';
                const finalAverageNum = parseFloat(newAverage);

                if (students[studentIndex].evaluations.length > 0) { // Only show status if there are evaluations
                    if (finalAverageNum >= 1 && finalAverageNum <= 9.4) {
                        statusHtml = '<span class="grade-status reprobado">Reprobado</span>';
                    } else if (finalAverageNum >= 9.5 && finalAverageNum <= 20) {
                        statusHtml = '<span class="grade-status aprobado">Aprobado</span>';
                    }
                }
                // Find the parent <p> element and update its content after the average span
                const finalAverageP = averageSpan.closest('.final-average');
                if (finalAverageP) {
                    // Remove any existing status span
                    const existingStatusSpan = finalAverageP.querySelector('.grade-status');
                    if (existingStatusSpan) {
                        existingStatusSpan.remove();
                    }
                    // Insert new status span if not empty
                    if (statusHtml) {
                        averageSpan.insertAdjacentHTML('afterend', statusHtml);
                    }
                }
            }
            saveStudents();
        }
    }
});

// Event listener for changing evaluation type, subject, or section
studentsContainer.addEventListener('change', (event) => {
    const target = event.target;
    // Handle evaluation type change
    if (target.classList.contains('evaluation-type-select')) {
        const studentIndex = parseInt(target.dataset.studentIndex);
        const evaluationIndex = parseInt(target.dataset.evaluationIndex);
        const newType = target.value;

        if (!isNaN(studentIndex) && !isNaN(evaluationIndex) && students[studentIndex]) {
            students[studentIndex].evaluations[evaluationIndex].type = newType;

            // Update weight based on the new type
            switch (newType) {
                case 'taller':
                    students[studentIndex].evaluations[evaluationIndex].weight = DEFAULT_TALLER_PERCENTAGE;
                    break;
                case 'cuaderno':
                    students[studentIndex].evaluations[evaluationIndex].weight = DEFAULT_CUADERNO_PERCENTAGE;
                    break;
                case 'rasgos':
                    students[studentIndex].evaluations[evaluationIndex].weight = DEFAULT_RASGOS_PERCENTAGE;
                    break;
                case 'evaluacion':
                default: // Default to evaluacion if new type is unrecognized
                    students[studentIndex].evaluations[evaluationIndex].weight = DEFAULT_EVALUATION_PERCENTAGE;
                    break;
            }

            renderStudentCard(students[studentIndex], studentIndex); // Re-render to update enumeration and weight display
            saveStudents();
        }
    }
    // Handle subject change
    if (target.classList.contains('subject-select')) {
        const studentIndex = parseInt(target.dataset.studentIndex);
        const newSubject = target.value;

        if (!isNaN(studentIndex) && students[studentIndex]) {
            students[studentIndex].subject = newSubject;
            // Update year based on new subject
            students[studentIndex].year = newSubject === 'matematica' ? '2do Año' : '3er Año';
            // Optionally, reset section to default 'A' when subject changes
            students[studentIndex].section = 'A';
            renderStudentCard(students[studentIndex], studentIndex); // Re-render to update year display and section select default
            saveStudents();
        }
    }
    // New: Handle section change
    if (target.classList.contains('section-select')) {
        const studentIndex = parseInt(target.dataset.studentIndex);
        const newSection = target.value;

        if (!isNaN(studentIndex) && students[studentIndex]) {
            students[studentIndex].section = newSection;
            saveStudents();
            // No need to re-render, the select element itself updates its display.
        }
    }
    // NEW: Handle moment change
    if (target.classList.contains('moment-select')) {
        const studentIndex = parseInt(target.dataset.studentIndex);
        const newMoment = target.value;

        if (!isNaN(studentIndex) && students[studentIndex]) {
            students[studentIndex].moment = newMoment;
            saveStudents();
            // No need to re-render, the select element itself updates its display.
        }
    }
});

// Initial load of students when the DOM is ready
document.addEventListener('DOMContentLoaded', loadStudents);
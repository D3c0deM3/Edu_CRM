const test_db = require('../../config/dbcon');

// ============================================================================
// Test CRUD Operations
// ============================================================================

exports.getAllTests = async (req: any, res: any) => {
  try {
    const { center_id, test_type, is_active, subject_id } = req.query;
    let query = `
      SELECT t.*, s.subject_name, 
             (SELECT COUNT(*) FROM test_questions WHERE test_id = t.test_id) as question_count,
             (SELECT COUNT(*) FROM test_submissions WHERE test_id = t.test_id) as submission_count
      FROM tests t
      LEFT JOIN subjects s ON t.subject_id = s.subject_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (center_id) {
      query += ` AND t.center_id = $${paramCount++}`;
      params.push(center_id);
    }
    if (test_type) {
      query += ` AND t.test_type = $${paramCount++}`;
      params.push(test_type);
    }
    if (is_active !== undefined) {
      query += ` AND t.is_active = $${paramCount++}`;
      params.push(is_active === 'true');
    }
    if (subject_id) {
      query += ` AND t.subject_id = $${paramCount++}`;
      params.push(subject_id);
    }

    query += ' ORDER BY t.created_at DESC';
    
    const result = await test_db.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch tests', details: error.message });
  }
};

exports.getTestById = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const testResult = await test_db.query(`
      SELECT t.*, s.subject_name
      FROM tests t
      LEFT JOIN subjects s ON t.subject_id = s.subject_id
      WHERE t.test_id = $1
    `, [id]);
    
    if (testResult.rows.length === 0) {
      return res.status(404).json({ error: 'Test not found' });
    }

    // Get questions
    const questionsResult = await test_db.query(`
      SELECT * FROM test_questions 
      WHERE test_id = $1 
      ORDER BY question_order ASC
    `, [id]);

    // Get passages if any
    const passagesResult = await test_db.query(`
      SELECT * FROM reading_passages 
      WHERE test_id = $1 
      ORDER BY passage_order ASC
    `, [id]);

    // Get assignments
    const assignmentsResult = await test_db.query(`
      SELECT * FROM test_assignments WHERE test_id = $1
    `, [id]);

    res.json({
      ...testResult.rows[0],
      questions: questionsResult.rows,
      passages: passagesResult.rows,
      assignments: assignmentsResult.rows
    });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch test', details: error.message });
  }
};

exports.createTest = async (req: any, res: any) => {
  try {
    const {
      center_id, subject_id, test_name, test_type, description, instructions,
      total_marks, passing_marks, duration_minutes, assignment_type,
      is_timed, shuffle_questions, show_results_immediately, allow_retake,
      max_retakes, test_data, created_by, created_by_type,
      start_date, end_date, questions, passages, assignments
    } = req.body;

    // Create the test
    const testResult = await test_db.query(`
      INSERT INTO tests (
        center_id, subject_id, test_name, test_type, description, instructions,
        total_marks, passing_marks, duration_minutes, assignment_type,
        is_timed, shuffle_questions, show_results_immediately, allow_retake,
        max_retakes, test_data, created_by, created_by_type, start_date, end_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *
    `, [
      center_id, subject_id, test_name, test_type, description, instructions,
      total_marks || 0, passing_marks || 0, duration_minutes || 60, assignment_type || 'all_students',
      is_timed !== false, shuffle_questions || false, show_results_immediately !== false,
      allow_retake || false, max_retakes || 1, JSON.stringify(test_data || {}),
      created_by, created_by_type || 'superuser', start_date, end_date
    ]);

    const testId = testResult.rows[0].test_id;

    // Add passages if provided
    if (passages && passages.length > 0) {
      for (let i = 0; i < passages.length; i++) {
        const p = passages[i];
        await test_db.query(`
          INSERT INTO reading_passages (test_id, title, content, word_count, difficulty_level, passage_order, audio_url, image_url)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [testId, p.title, p.content, p.word_count, p.difficulty_level || 'medium', i + 1, p.audio_url, p.image_url]);
      }
    }

    // Add questions if provided
    if (questions && questions.length > 0) {
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        await test_db.query(`
          INSERT INTO test_questions (
            test_id, passage_id, question_text, question_type, marks, negative_marks,
            question_order, options, correct_answer, explanation, image_url, is_required, word_limit
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        `, [
          testId, q.passage_id, q.question_text, q.question_type, q.marks || 1, q.negative_marks || 0,
          i + 1, JSON.stringify(q.options), JSON.stringify(q.correct_answer),
          q.explanation, q.image_url, q.is_required !== false, q.word_limit
        ]);
      }
    }

    // Add assignments if provided
    if (assignments && assignments.length > 0) {
      for (const a of assignments) {
        await test_db.query(`
          INSERT INTO test_assignments (test_id, assigned_to_type, assigned_to_id, assigned_by, due_date, is_mandatory, notes)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [testId, a.assigned_to_type, a.assigned_to_id, created_by, a.due_date, a.is_mandatory !== false, a.notes]);
      }
    }

    res.status(201).json({ message: 'Test created successfully', test: testResult.rows[0] });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to create test', details: error.message });
  }
};

exports.updateTest = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const {
      test_name, description, instructions, total_marks, passing_marks,
      duration_minutes, is_timed, shuffle_questions, show_results_immediately,
      allow_retake, max_retakes, is_active, start_date, end_date
    } = req.body;

    const result = await test_db.query(`
      UPDATE tests SET
        test_name = COALESCE($1, test_name),
        description = COALESCE($2, description),
        instructions = COALESCE($3, instructions),
        total_marks = COALESCE($4, total_marks),
        passing_marks = COALESCE($5, passing_marks),
        duration_minutes = COALESCE($6, duration_minutes),
        is_timed = COALESCE($7, is_timed),
        shuffle_questions = COALESCE($8, shuffle_questions),
        show_results_immediately = COALESCE($9, show_results_immediately),
        allow_retake = COALESCE($10, allow_retake),
        max_retakes = COALESCE($11, max_retakes),
        is_active = COALESCE($12, is_active),
        start_date = COALESCE($13, start_date),
        end_date = COALESCE($14, end_date),
        updated_at = CURRENT_TIMESTAMP
      WHERE test_id = $15
      RETURNING *
    `, [
      test_name, description, instructions, total_marks, passing_marks,
      duration_minutes, is_timed, shuffle_questions, show_results_immediately,
      allow_retake, max_retakes, is_active, start_date, end_date, id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Test not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to update test', details: error.message });
  }
};

exports.deleteTest = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const result = await test_db.query('DELETE FROM tests WHERE test_id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Test not found' });
    }
    res.json({ message: 'Test deleted successfully', test: result.rows[0] });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to delete test', details: error.message });
  }
};

// ============================================================================
// Question Operations
// ============================================================================

exports.addQuestion = async (req: any, res: any) => {
  try {
    const { testId } = req.params;
    const {
      passage_id, question_text, question_type, marks, negative_marks,
      options, correct_answer, explanation, image_url, is_required, word_limit
    } = req.body;

    // Get next question order
    const orderResult = await test_db.query(
      'SELECT COALESCE(MAX(question_order), 0) + 1 as next_order FROM test_questions WHERE test_id = $1',
      [testId]
    );

    const result = await test_db.query(`
      INSERT INTO test_questions (
        test_id, passage_id, question_text, question_type, marks, negative_marks,
        question_order, options, correct_answer, explanation, image_url, is_required, word_limit
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      testId, passage_id, question_text, question_type, marks || 1, negative_marks || 0,
      orderResult.rows[0].next_order, JSON.stringify(options), JSON.stringify(correct_answer),
      explanation, image_url, is_required !== false, word_limit
    ]);

    // Update total marks
    await updateTestTotalMarks(testId);

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to add question', details: error.message });
  }
};

exports.updateQuestion = async (req: any, res: any) => {
  try {
    const { questionId } = req.params;
    const {
      question_text, question_type, marks, negative_marks,
      options, correct_answer, explanation, image_url, is_required, word_limit
    } = req.body;

    const result = await test_db.query(`
      UPDATE test_questions SET
        question_text = COALESCE($1, question_text),
        question_type = COALESCE($2, question_type),
        marks = COALESCE($3, marks),
        negative_marks = COALESCE($4, negative_marks),
        options = COALESCE($5, options),
        correct_answer = COALESCE($6, correct_answer),
        explanation = COALESCE($7, explanation),
        image_url = COALESCE($8, image_url),
        is_required = COALESCE($9, is_required),
        word_limit = COALESCE($10, word_limit)
      WHERE question_id = $11
      RETURNING *
    `, [
      question_text, question_type, marks, negative_marks,
      options ? JSON.stringify(options) : null,
      correct_answer ? JSON.stringify(correct_answer) : null,
      explanation, image_url, is_required, word_limit, questionId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // Update total marks
    const testId = result.rows[0].test_id;
    await updateTestTotalMarks(testId);

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to update question', details: error.message });
  }
};

exports.deleteQuestion = async (req: any, res: any) => {
  try {
    const { questionId } = req.params;
    
    const result = await test_db.query('DELETE FROM test_questions WHERE question_id = $1 RETURNING *', [questionId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // Update total marks
    await updateTestTotalMarks(result.rows[0].test_id);

    res.json({ message: 'Question deleted successfully', question: result.rows[0] });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to delete question', details: error.message });
  }
};

// ============================================================================
// Reading Passage Operations
// ============================================================================

exports.addPassage = async (req: any, res: any) => {
  try {
    const { testId } = req.params;
    const { title, content, word_count, difficulty_level, audio_url, image_url } = req.body;

    const orderResult = await test_db.query(
      'SELECT COALESCE(MAX(passage_order), 0) + 1 as next_order FROM reading_passages WHERE test_id = $1',
      [testId]
    );

    const result = await test_db.query(`
      INSERT INTO reading_passages (test_id, title, content, word_count, difficulty_level, passage_order, audio_url, image_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [testId, title, content, word_count, difficulty_level || 'medium', orderResult.rows[0].next_order, audio_url, image_url]);

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to add passage', details: error.message });
  }
};

exports.updatePassage = async (req: any, res: any) => {
  try {
    const { passageId } = req.params;
    const { title, content, word_count, difficulty_level, audio_url, image_url } = req.body;

    const result = await test_db.query(`
      UPDATE reading_passages SET
        title = COALESCE($1, title),
        content = COALESCE($2, content),
        word_count = COALESCE($3, word_count),
        difficulty_level = COALESCE($4, difficulty_level),
        audio_url = COALESCE($5, audio_url),
        image_url = COALESCE($6, image_url)
      WHERE passage_id = $7
      RETURNING *
    `, [title, content, word_count, difficulty_level, audio_url, image_url, passageId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Passage not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to update passage', details: error.message });
  }
};

exports.deletePassage = async (req: any, res: any) => {
  try {
    const { passageId } = req.params;
    const result = await test_db.query('DELETE FROM reading_passages WHERE passage_id = $1 RETURNING *', [passageId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Passage not found' });
    }
    res.json({ message: 'Passage deleted successfully', passage: result.rows[0] });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to delete passage', details: error.message });
  }
};

// ============================================================================
// Test Submission Operations
// ============================================================================

exports.startTest = async (req: any, res: any) => {
  try {
    const { testId } = req.params;
    const { student_id, user_type } = req.body;

    // Check if test exists and is active
    const testResult = await test_db.query('SELECT * FROM tests WHERE test_id = $1 AND is_active = true', [testId]);
    if (testResult.rows.length === 0) {
      return res.status(404).json({ error: 'Test not found or inactive' });
    }

    const test = testResult.rows[0];

    // For superusers and teachers, skip assignment checks and use a test student
    const isTester = user_type === 'superuser' || user_type === 'teacher';
    let effectiveStudentId = student_id;
    
    if (isTester) {
      // Try to find any student to use as a placeholder for testing
      const anyStudent = await test_db.query('SELECT student_id FROM students LIMIT 1');
      if (anyStudent.rows.length > 0) {
        effectiveStudentId = anyStudent.rows[0].student_id;
      } else {
        return res.status(400).json({ error: 'No students exist in the system. Please create a student first to test.' });
      }
    } else {
      // Check if student can take this test (only for actual students)
      if (test.assignment_type !== 'all_students') {
        const assignmentCheck = await test_db.query(`
          SELECT * FROM test_assignments 
          WHERE test_id = $1 AND assigned_to_type = 'student' AND assigned_to_id = $2
        `, [testId, student_id]);
        
        if (assignmentCheck.rows.length === 0) {
          return res.status(403).json({ error: 'You are not assigned to take this test' });
        }
      }
    }

    // Check existing submissions
    const existingSubmission = await test_db.query(`
      SELECT * FROM test_submissions 
      WHERE test_id = $1 AND student_id = $2 AND status IN ('not_started', 'in_progress')
    `, [testId, effectiveStudentId]);

    if (existingSubmission.rows.length > 0) {
      return res.json(existingSubmission.rows[0]);
    }

    // Check retake limit (skip for testers)
    const attemptCount = await test_db.query(
      'SELECT COUNT(*) as count FROM test_submissions WHERE test_id = $1 AND student_id = $2',
      [testId, effectiveStudentId]
    );

    if (!isTester) {
      if (!test.allow_retake && parseInt(attemptCount.rows[0].count) > 0) {
        return res.status(403).json({ error: 'Retakes not allowed for this test' });
      }

      if (test.allow_retake && parseInt(attemptCount.rows[0].count) >= test.max_retakes) {
        return res.status(403).json({ error: 'Maximum retake limit reached' });
      }
    }

    // Create new submission
    const result = await test_db.query(`
      INSERT INTO test_submissions (test_id, student_id, status, attempt_number, ip_address)
      VALUES ($1, $2, 'in_progress', $3, $4)
      RETURNING *
    `, [testId, effectiveStudentId, parseInt(attemptCount.rows[0].count) + 1, req.ip]);

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to start test', details: error.message });
  }
};

exports.submitTest = async (req: any, res: any) => {
  try {
    const { submissionId } = req.params;
    const { answers } = req.body;

    // Get submission
    const submissionResult = await test_db.query(
      'SELECT * FROM test_submissions WHERE submission_id = $1',
      [submissionId]
    );

    if (submissionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const submission = submissionResult.rows[0];

    // Get test and questions
    const testResult = await test_db.query('SELECT * FROM tests WHERE test_id = $1', [submission.test_id]);
    const questionsResult = await test_db.query('SELECT * FROM test_questions WHERE test_id = $1', [submission.test_id]);

    const test = testResult.rows[0];
    const questions = questionsResult.rows;

    // Calculate score for auto-gradable questions
    let obtainedMarks = 0;
    let totalMarks = 0;
    const gradedAnswers: any[] = [];

    for (const question of questions) {
      const studentAnswer = answers[question.question_id];
      totalMarks += question.marks;

      const answerRecord: any = {
        submission_id: submissionId,
        question_id: question.question_id,
        student_answer: studentAnswer,
        marks_obtained: 0,
        is_correct: false,
        graded: false
      };

      // Auto-grade for objective questions
      if (['multiple_choice', 'true_false', 'form_filling', 'short_answer'].includes(question.question_type)) {
        const isCorrect = checkAnswer(question, studentAnswer);
        answerRecord.is_correct = isCorrect;
        answerRecord.marks_obtained = isCorrect ? question.marks : (question.negative_marks ? -question.negative_marks : 0);
        answerRecord.graded = true;
        obtainedMarks += answerRecord.marks_obtained;
      }

      gradedAnswers.push(answerRecord);
    }

    // Save individual answers
    for (const answer of gradedAnswers) {
      await test_db.query(`
        INSERT INTO test_answers (submission_id, question_id, student_answer, is_correct, marks_obtained, graded)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [answer.submission_id, answer.question_id, JSON.stringify(answer.student_answer), answer.is_correct, answer.marks_obtained, answer.graded]);
    }

    // Calculate time taken
    const timeTaken = Math.floor((new Date().getTime() - new Date(submission.started_at).getTime()) / 1000);

    // Update submission
    const percentage = totalMarks > 0 ? (obtainedMarks / totalMarks) * 100 : 0;
    const isPassed = percentage >= ((test.passing_marks / test.total_marks) * 100);
    const hasManualGrading = questions.some((q: any) => ['essay', 'writing'].includes(q.question_type));

    const updateResult = await test_db.query(`
      UPDATE test_submissions SET
        submission_data = $1,
        submitted_at = CURRENT_TIMESTAMP,
        time_taken_seconds = $2,
        obtained_marks = $3,
        total_score = $4,
        percentage = $5,
        is_passed = $6,
        status = $7,
        updated_at = CURRENT_TIMESTAMP
      WHERE submission_id = $8
      RETURNING *
    `, [
      JSON.stringify({ answers }),
      timeTaken,
      obtainedMarks,
      totalMarks,
      percentage,
      hasManualGrading ? null : isPassed,
      hasManualGrading ? 'submitted' : 'graded',
      submissionId
    ]);

    // Update or create results summary
    await updateResultsSummary(submission.test_id, submission.student_id);

    res.json({
      message: hasManualGrading ? 'Test submitted, awaiting manual grading' : 'Test submitted and graded',
      submission: updateResult.rows[0],
      score: {
        obtained: obtainedMarks,
        total: totalMarks,
        percentage: percentage.toFixed(2),
        passed: hasManualGrading ? null : isPassed
      }
    });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to submit test', details: error.message });
  }
};

exports.gradeSubmission = async (req: any, res: any) => {
  try {
    const { submissionId } = req.params;
    const { answer_grades, feedback, graded_by, graded_by_type } = req.body;

    // Update individual answers
    let additionalMarks = 0;
    for (const grade of answer_grades) {
      await test_db.query(`
        UPDATE test_answers SET
          marks_obtained = $1,
          feedback = $2,
          graded = true,
          graded_at = CURRENT_TIMESTAMP
        WHERE submission_id = $3 AND question_id = $4
      `, [grade.marks_obtained, grade.feedback, submissionId, grade.question_id]);
      additionalMarks += grade.marks_obtained;
    }

    // Recalculate total score
    const answersResult = await test_db.query(
      'SELECT SUM(marks_obtained) as total FROM test_answers WHERE submission_id = $1',
      [submissionId]
    );
    const obtainedMarks = parseFloat(answersResult.rows[0].total) || 0;

    // Get test for passing threshold
    const submissionResult = await test_db.query('SELECT * FROM test_submissions WHERE submission_id = $1', [submissionId]);
    const testResult = await test_db.query('SELECT * FROM tests WHERE test_id = $1', [submissionResult.rows[0].test_id]);
    const test = testResult.rows[0];

    const percentage = test.total_marks > 0 ? (obtainedMarks / test.total_marks) * 100 : 0;
    const isPassed = percentage >= ((test.passing_marks / test.total_marks) * 100);

    // Update submission
    const updateResult = await test_db.query(`
      UPDATE test_submissions SET
        obtained_marks = $1,
        percentage = $2,
        is_passed = $3,
        feedback = $4,
        graded_by = $5,
        graded_by_type = $6,
        graded_at = CURRENT_TIMESTAMP,
        status = 'graded',
        updated_at = CURRENT_TIMESTAMP
      WHERE submission_id = $7
      RETURNING *
    `, [obtainedMarks, percentage, isPassed, feedback, graded_by, graded_by_type, submissionId]);

    // Update results summary
    await updateResultsSummary(submissionResult.rows[0].test_id, submissionResult.rows[0].student_id);

    res.json({ message: 'Submission graded successfully', submission: updateResult.rows[0] });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to grade submission', details: error.message });
  }
};

exports.getSubmissionsByTest = async (req: any, res: any) => {
  try {
    const { testId } = req.params;
    const result = await test_db.query(`
      SELECT ts.*, s.first_name, s.last_name, s.enrollment_number
      FROM test_submissions ts
      JOIN students s ON ts.student_id = s.student_id
      WHERE ts.test_id = $1
      ORDER BY ts.submitted_at DESC
    `, [testId]);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch submissions', details: error.message });
  }
};

exports.getSubmissionsByStudent = async (req: any, res: any) => {
  try {
    const { studentId } = req.params;
    const result = await test_db.query(`
      SELECT ts.*, t.test_name, t.test_type, t.total_marks
      FROM test_submissions ts
      JOIN tests t ON ts.test_id = t.test_id
      WHERE ts.student_id = $1
      ORDER BY ts.submitted_at DESC
    `, [studentId]);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch submissions', details: error.message });
  }
};

exports.getSubmissionDetails = async (req: any, res: any) => {
  try {
    const { submissionId } = req.params;
    
    const submissionResult = await test_db.query(`
      SELECT ts.*, t.test_name, t.test_type, t.total_marks, t.passing_marks,
             s.first_name, s.last_name, s.enrollment_number
      FROM test_submissions ts
      JOIN tests t ON ts.test_id = t.test_id
      JOIN students s ON ts.student_id = s.student_id
      WHERE ts.submission_id = $1
    `, [submissionId]);

    if (submissionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const answersResult = await test_db.query(`
      SELECT ta.*, tq.question_text, tq.question_type, tq.marks, tq.options, tq.correct_answer, tq.explanation
      FROM test_answers ta
      JOIN test_questions tq ON ta.question_id = tq.question_id
      WHERE ta.submission_id = $1
      ORDER BY tq.question_order
    `, [submissionId]);

    res.json({
      ...submissionResult.rows[0],
      answers: answersResult.rows
    });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch submission details', details: error.message });
  }
};

// ============================================================================
// Test Results & Statistics
// ============================================================================

exports.getTestResults = async (req: any, res: any) => {
  try {
    const { testId } = req.params;
    
    const statsResult = await test_db.query(`
      SELECT 
        COUNT(*) as total_submissions,
        COUNT(*) FILTER (WHERE status = 'graded') as graded_count,
        COUNT(*) FILTER (WHERE is_passed = true) as passed_count,
        AVG(percentage) as average_percentage,
        MIN(percentage) as min_percentage,
        MAX(percentage) as max_percentage,
        AVG(time_taken_seconds) as avg_time_seconds
      FROM test_submissions
      WHERE test_id = $1
    `, [testId]);

    const submissionsResult = await test_db.query(`
      SELECT ts.*, s.first_name, s.last_name, s.enrollment_number
      FROM test_submissions ts
      JOIN students s ON ts.student_id = s.student_id
      WHERE ts.test_id = $1 AND ts.status = 'graded'
      ORDER BY ts.percentage DESC
    `, [testId]);

    res.json({
      statistics: statsResult.rows[0],
      submissions: submissionsResult.rows
    });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch test results', details: error.message });
  }
};

exports.getStudentResults = async (req: any, res: any) => {
  try {
    const { studentId } = req.params;
    
    const result = await test_db.query(`
      SELECT trs.*, t.test_name, t.test_type, t.total_marks, s.subject_name
      FROM test_results_summary trs
      JOIN tests t ON trs.test_id = t.test_id
      LEFT JOIN subjects s ON t.subject_id = s.subject_id
      WHERE trs.student_id = $1
      ORDER BY trs.last_attempt_at DESC
    `, [studentId]);

    res.json(result.rows);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch student results', details: error.message });
  }
};

// ============================================================================
// Assign Tests
// ============================================================================

exports.assignTest = async (req: any, res: any) => {
  try {
    const { testId } = req.params;
    const { assignments, assigned_by } = req.body;

    const results: any[] = [];
    for (const a of assignments) {
      const result = await test_db.query(`
        INSERT INTO test_assignments (test_id, assigned_to_type, assigned_to_id, assigned_by, due_date, is_mandatory, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (test_id, assigned_to_type, assigned_to_id) 
        DO UPDATE SET due_date = $5, is_mandatory = $6, notes = $7
        RETURNING *
      `, [testId, a.assigned_to_type, a.assigned_to_id, assigned_by, a.due_date, a.is_mandatory !== false, a.notes]);
      results.push(result.rows[0]);
    }

    res.status(201).json({ message: 'Test assigned successfully', assignments: results });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to assign test', details: error.message });
  }
};

exports.getAssignedTests = async (req: any, res: any) => {
  try {
    const { type, id } = req.params;
    const { student_id } = req.query; // Optional: for getting submission status when type is 'class'
    
    // Determine which student_id to use for submission lookups
    const studentIdForSubmission = student_id || (type === 'student' ? id : null);
    
    let query;
    let params;
    
    if (studentIdForSubmission) {
      // Include submission status for the specific student
      query = `
        SELECT t.*, ta.due_date, ta.is_mandatory, ta.notes as assignment_notes,
               s.subject_name,
               (SELECT COUNT(*) FROM test_submissions WHERE test_id = t.test_id AND student_id = $3) as attempts,
               (SELECT status FROM test_submissions WHERE test_id = t.test_id AND student_id = $3 ORDER BY submitted_at DESC LIMIT 1) as submission_status,
               (SELECT obtained_marks FROM test_submissions WHERE test_id = t.test_id AND student_id = $3 ORDER BY submitted_at DESC LIMIT 1) as score,
               (SELECT submitted_at FROM test_submissions WHERE test_id = t.test_id AND student_id = $3 ORDER BY submitted_at DESC LIMIT 1) as submitted_at
        FROM tests t
        JOIN test_assignments ta ON t.test_id = ta.test_id
        LEFT JOIN subjects s ON t.subject_id = s.subject_id
        WHERE ta.assigned_to_type = $1 AND ta.assigned_to_id = $2 AND t.is_active = true
        ORDER BY ta.due_date ASC NULLS LAST
      `;
      params = [type, id, studentIdForSubmission];
    } else {
      // No student context - return tests without submission info
      query = `
        SELECT t.*, ta.due_date, ta.is_mandatory, ta.notes as assignment_notes,
               s.subject_name
        FROM tests t
        JOIN test_assignments ta ON t.test_id = ta.test_id
        LEFT JOIN subjects s ON t.subject_id = s.subject_id
        WHERE ta.assigned_to_type = $1 AND ta.assigned_to_id = $2 AND t.is_active = true
        ORDER BY ta.due_date ASC NULLS LAST
      `;
      params = [type, id];
    }

    const result = await test_db.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch assigned tests', details: error.message });
  }
};

// ============================================================================
// Helper Functions
// ============================================================================

function checkAnswer(question: any, studentAnswer: any): boolean {
  const correctAnswer = question.correct_answer;
  
  if (!studentAnswer || !correctAnswer) return false;

  switch (question.question_type) {
    case 'multiple_choice':
      // Get student's selected index (support both 'index' and 'selected' keys)
      const studentIndex = studentAnswer.index ?? studentAnswer.selected;
      const correctIndex = correctAnswer.index ?? correctAnswer.selected;
      
      if (correctAnswer.indexes) {
        // Multiple correct answers
        const selectedIndexes = studentAnswer.selected || studentAnswer.indexes || [studentIndex];
        return JSON.stringify([...selectedIndexes].sort()) === JSON.stringify([...correctAnswer.indexes].sort());
      }
      return studentIndex === correctIndex;
    
    case 'true_false':
      return studentAnswer.value === correctAnswer.value;
    
    case 'form_filling':
    case 'short_answer':
      const answers = correctAnswer.answers || [correctAnswer.answer] || [correctAnswer.text];
      const studentText = studentAnswer.text || studentAnswer.answer || '';
      return answers.some((a: string) => 
        a && a.toLowerCase().trim() === String(studentText).toLowerCase().trim()
      );
    
    case 'matching':
      if (!studentAnswer.pairs || !correctAnswer.pairs) return false;
      return JSON.stringify(studentAnswer.pairs.sort((a: any, b: any) => a.left - b.left)) === 
             JSON.stringify(correctAnswer.pairs.sort((a: any, b: any) => a.left - b.left));
    
    default:
      return false;
  }
}

async function updateTestTotalMarks(testId: number) {
  await test_db.query(`
    UPDATE tests SET 
      total_marks = (SELECT COALESCE(SUM(marks), 0) FROM test_questions WHERE test_id = $1),
      updated_at = CURRENT_TIMESTAMP
    WHERE test_id = $1
  `, [testId]);
}

async function updateResultsSummary(testId: number, studentId: number) {
  await test_db.query(`
    INSERT INTO test_results_summary (test_id, student_id, best_score, average_score, total_attempts, last_attempt_at, first_passed_at, is_completed)
    SELECT 
      $1, $2,
      MAX(percentage),
      AVG(percentage),
      COUNT(*),
      MAX(submitted_at),
      MIN(CASE WHEN is_passed = true THEN submitted_at END),
      bool_or(status = 'graded')
    FROM test_submissions
    WHERE test_id = $1 AND student_id = $2
    ON CONFLICT (test_id, student_id) DO UPDATE SET
      best_score = EXCLUDED.best_score,
      average_score = EXCLUDED.average_score,
      total_attempts = EXCLUDED.total_attempts,
      last_attempt_at = EXCLUDED.last_attempt_at,
      first_passed_at = COALESCE(test_results_summary.first_passed_at, EXCLUDED.first_passed_at),
      is_completed = EXCLUDED.is_completed,
      updated_at = CURRENT_TIMESTAMP
  `, [testId, studentId]);
}

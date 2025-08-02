<script lang="ts">
  import { PasswordRecoveryService, RecoveryQuestion } from '../crypto/password-recovery';
  import { pointsApi } from '../api/points';

  let password = '';
  let isRecoveryMode = false;
  let recoveryService = new PasswordRecoveryService();
  
  // Recovery setup
  let recoveryQuestions: RecoveryQuestion[] = [
    { id: '1', question: '', answer: '' },
    { id: '2', question: '', answer: '' },
    { id: '3', question: '', answer: '' }
  ];
  
  let threshold = 2;
  let suggestedQuestions = recoveryService.getSuggestedQuestions();
  let selectedQuestions: string[] = [];
  
  // Recovery process
  let recoveryAnswers: string[] = [];
  let recoveryShares: any[] = [];
  let recoveredPassword = '';
  
  // UI state
  let loading = false;
  let error = '';
  let success = '';

  // Setup recovery
  async function setupRecovery() {
    if (!password.trim()) {
      error = 'Please enter your password';
      return;
    }

    // Validate questions
    const errors = recoveryService.validateRecoveryQuestions(recoveryQuestions);
    if (errors.length > 0) {
      error = errors.join(', ');
      return;
    }

    loading = true;
    error = '';

    try {
      // Filter out empty questions
      const validQuestions = recoveryQuestions.filter(q => q.question.trim() && q.answer.trim());
      
      const recoverySetup = await recoveryService.setupRecovery(
        password,
        validQuestions,
        threshold
      );

      // Store recovery shares (in practice, this would be sent to server)
      localStorage.setItem('recoveryShares', JSON.stringify(recoverySetup.shares));
      
      success = `Recovery setup complete! You need ${threshold} correct answers to recover your password.`;
      
      // Set password for the API
      pointsApi.setPassword(password);
      
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to setup recovery';
    } finally {
      loading = false;
    }
  }

  // Recover password
  async function recoverPassword() {
    if (recoveryAnswers.length < threshold) {
      error = `Please provide at least ${threshold} answers`;
      return;
    }

    loading = true;
    error = '';

    try {
      // Get stored recovery shares
      const storedShares = localStorage.getItem('recoveryShares');
      if (!storedShares) {
        throw new Error('No recovery setup found. Please setup recovery first.');
      }

      const shares = JSON.parse(storedShares);
      
      const recoveredPassword = await recoveryService.recoverPassword(
        shares,
        recoveryAnswers
      );

      success = `Password recovered successfully! Your password is: ${recoveredPassword}`;
      
      // Set recovered password for the API
      pointsApi.setPassword(recoveredPassword);
      
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to recover password';
    } finally {
      loading = false;
    }
  }

  // Add question
  function addQuestion() {
    if (recoveryQuestions.length < 5) {
      recoveryQuestions = [
        ...recoveryQuestions,
        { id: (recoveryQuestions.length + 1).toString(), question: '', answer: '' }
      ];
    }
  }

  // Remove question
  function removeQuestion(index: number) {
    if (recoveryQuestions.length > 2) {
      recoveryQuestions = recoveryQuestions.filter((_, i) => i !== index);
    }
  }

  // Select suggested question
  function selectSuggestedQuestion(question: string, index: number) {
    recoveryQuestions[index].question = question;
  }

  // Toggle recovery mode
  function toggleRecoveryMode() {
    isRecoveryMode = !isRecoveryMode;
    error = '';
    success = '';
  }
</script>

<div class="recovery-container">
  <h2>🔐 Password Recovery Setup</h2>
  
  <div class="mode-toggle">
    <button 
      class:active={!isRecoveryMode} 
      on:click={() => isRecoveryMode = false}
    >
      Setup Recovery
    </button>
    <button 
      class:active={isRecoveryMode} 
      on:click={() => isRecoveryMode = true}
    >
      Recover Password
    </button>
  </div>

  {#if error}
    <div class="error">{error}</div>
  {/if}

  {#if success}
    <div class="success">{success}</div>
  {/if}

  {#if !isRecoveryMode}
    <!-- Setup Recovery -->
    <div class="setup-section">
      <h3>Setup Password Recovery</h3>
      <p>Set up security questions to recover your password if you forget it.</p>
      
      <div class="password-input">
        <label for="password">Your Password:</label>
        <input
          id="password"
          type="password"
          bind:value={password}
          placeholder="Enter your password"
        />
      </div>

      <div class="threshold-setting">
        <label for="threshold">Minimum answers needed to recover:</label>
        <select id="threshold" bind:value={threshold}>
          <option value={2}>2 answers</option>
          <option value={3}>3 answers</option>
          <option value={4}>4 answers</option>
          <option value={5}>5 answers</option>
        </select>
      </div>

      <div class="questions-section">
        <h4>Security Questions ({recoveryQuestions.length}/5)</h4>
        
        {#each recoveryQuestions as question, index}
          <div class="question-row">
            <div class="question-input">
              <label>Question {index + 1}:</label>
              <input
                type="text"
                bind:value={question.question}
                placeholder="Enter your security question"
              />
            </div>
            
            <div class="answer-input">
              <label>Answer:</label>
              <input
                type="text"
                bind:value={question.answer}
                placeholder="Enter your answer"
              />
            </div>
            
            {#if recoveryQuestions.length > 2}
              <button 
                class="remove-btn" 
                on:click={() => removeQuestion(index)}
                type="button"
              >
                Remove
              </button>
            {/if}
          </div>
        {/each}
        
        {#if recoveryQuestions.length < 5}
          <button class="add-btn" on:click={addQuestion} type="button">
            + Add Question
          </button>
        {/if}
      </div>

      <div class="suggested-questions">
        <h4>Suggested Questions</h4>
        <div class="suggested-grid">
          {#each suggestedQuestions as question, index}
            <button
              class="suggested-btn"
              on:click={() => selectSuggestedQuestion(question, index)}
              disabled={index >= recoveryQuestions.length}
            >
              {question}
            </button>
          {/each}
        </div>
      </div>

      <button 
        class="setup-btn" 
        on:click={setupRecovery}
        disabled={loading || !password.trim()}
      >
        {loading ? 'Setting up recovery...' : 'Setup Recovery'}
      </button>
    </div>
  {:else}
    <!-- Recover Password -->
    <div class="recover-section">
      <h3>Recover Your Password</h3>
      <p>Answer your security questions to recover your password.</p>
      
      {#if recoveryShares.length > 0}
        <div class="recovery-questions">
          {#each recoveryShares as share, index}
            <div class="recovery-question">
              <label>{share.question}:</label>
              <input
                type="text"
                bind:value={recoveryAnswers[index]}
                placeholder="Enter your answer"
              />
            </div>
          {/each}
        </div>
        
        <button 
          class="recover-btn" 
          on:click={recoverPassword}
          disabled={loading}
        >
          {loading ? 'Recovering password...' : 'Recover Password'}
        </button>
      {:else}
        <div class="no-recovery">
          <p>No recovery setup found. Please setup recovery first.</p>
          <button on:click={() => isRecoveryMode = false}>
            Setup Recovery
          </button>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .recovery-container {
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  h2 {
    text-align: center;
    color: #333;
    margin-bottom: 20px;
  }

  .mode-toggle {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
  }

  .mode-toggle button {
    flex: 1;
    padding: 12px;
    border: 2px solid #ddd;
    background: white;
    color: #666;
    border-radius: 6px;
    cursor: pointer;
    font-size: 16px;
  }

  .mode-toggle button.active {
    border-color: #007bff;
    background: #007bff;
    color: white;
  }

  .error {
    background: #f8d7da;
    color: #721c24;
    padding: 12px;
    border-radius: 6px;
    margin-bottom: 20px;
  }

  .success {
    background: #d4edda;
    color: #155724;
    padding: 12px;
    border-radius: 6px;
    margin-bottom: 20px;
  }

  .setup-section,
  .recover-section {
    background: #f8f9fa;
    padding: 20px;
    border-radius: 8px;
  }

  .password-input,
  .threshold-setting {
    margin-bottom: 20px;
  }

  .password-input label,
  .threshold-setting label {
    display: block;
    margin-bottom: 5px;
    font-weight: 500;
    color: #333;
  }

  .password-input input,
  .threshold-setting select {
    width: 100%;
    padding: 12px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 16px;
  }

  .questions-section h4 {
    margin-bottom: 15px;
    color: #333;
  }

  .question-row {
    display: grid;
    grid-template-columns: 1fr 1fr auto;
    gap: 10px;
    margin-bottom: 15px;
    align-items: end;
  }

  .question-input,
  .answer-input {
    display: flex;
    flex-direction: column;
  }

  .question-input label,
  .answer-input label {
    margin-bottom: 5px;
    font-size: 14px;
    color: #666;
  }

  .question-input input,
  .answer-input input {
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
  }

  .remove-btn {
    padding: 8px 12px;
    background: #dc3545;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
  }

  .add-btn {
    padding: 10px 20px;
    background: #28a745;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    margin-bottom: 20px;
  }

  .suggested-questions h4 {
    margin-bottom: 15px;
    color: #333;
  }

  .suggested-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 10px;
    margin-bottom: 20px;
  }

  .suggested-btn {
    padding: 10px;
    background: #e9ecef;
    color: #495057;
    border: 1px solid #ced4da;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    text-align: left;
    transition: background-color 0.2s;
  }

  .suggested-btn:hover {
    background: #dee2e6;
  }

  .suggested-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .setup-btn,
  .recover-btn {
    width: 100%;
    padding: 15px;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 16px;
    font-weight: 500;
  }

  .setup-btn:disabled,
  .recover-btn:disabled {
    background: #6c757d;
    cursor: not-allowed;
  }

  .recovery-questions {
    margin-bottom: 20px;
  }

  .recovery-question {
    margin-bottom: 15px;
  }

  .recovery-question label {
    display: block;
    margin-bottom: 5px;
    font-weight: 500;
    color: #333;
  }

  .recovery-question input {
    width: 100%;
    padding: 12px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 16px;
  }

  .no-recovery {
    text-align: center;
    padding: 40px 20px;
  }

  .no-recovery p {
    color: #666;
    margin-bottom: 20px;
  }

  .no-recovery button {
    padding: 12px 24px;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 16px;
  }
</style>
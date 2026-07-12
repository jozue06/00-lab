<script lang="ts">
  import { onMount } from 'svelte';
  import { pointsApi } from '../api/points';
  import type { Point } from '../crypto/encryption';

  let password = '';
  let isAuthenticated = false;
  let points: Point[] = [];
  let loading = false;
  let error = '';

  // Form data for new point
  let newPoint = {
    date: '',
    title: '',
    description: ''
  };

  // Form data for editing
  let editingPoint: Point | null = null;
  let editForm = {
    date: '',
    title: '',
    description: ''
  };

  // Set password and authenticate
  function setPassword() {
    if (password.trim()) {
      pointsApi.setPassword(password);
      isAuthenticated = true;
      loadPoints();
    }
  }

  // Load all points
  async function loadPoints() {
    if (!isAuthenticated) return;
    
    loading = true;
    error = '';
    
    try {
      points = await pointsApi.getAllPoints();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load points';
    } finally {
      loading = false;
    }
  }

  // Create new point
  async function createPoint() {
    if (!isAuthenticated || !newPoint.date || !newPoint.title || !newPoint.description) return;
    
    loading = true;
    error = '';
    
    try {
      const createdPoint = await pointsApi.createPoint(newPoint);
      points = [createdPoint, ...points];
      
      // Reset form
      newPoint = { date: '', title: '', description: '' };
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to create point';
    } finally {
      loading = false;
    }
  }

  // Start editing a point
  function startEdit(point: Point) {
    editingPoint = point;
    editForm = {
      date: point.date,
      title: point.title,
      description: point.description
    };
  }

  // Cancel editing
  function cancelEdit() {
    editingPoint = null;
    editForm = { date: '', title: '', description: '' };
  }

  // Update point
  async function updatePoint() {
    if (!isAuthenticated || !editingPoint) return;
    
    loading = true;
    error = '';
    
    try {
      const updatedPoint = await pointsApi.updatePoint(editingPoint.id!, editForm);
      
      // Update the point in the list
      points = points.map(p => p.id === editingPoint.id ? updatedPoint : p);
      
      // Reset editing
      editingPoint = null;
      editForm = { date: '', title: '', description: '' };
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to update point';
    } finally {
      loading = false;
    }
  }

  // Delete point
  async function deletePoint(id: number) {
    if (!isAuthenticated) return;
    
    if (!confirm('Are you sure you want to delete this point?')) return;
    
    loading = true;
    error = '';
    
    try {
      await pointsApi.deletePoint(id);
      points = points.filter(p => p.id !== id);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to delete point';
    } finally {
      loading = false;
    }
  }

  // Load points on mount if authenticated
  onMount(() => {
    if (isAuthenticated) {
      loadPoints();
    }
  });
</script>

<div class="container">
  <h1>🔐 End-to-End Encrypted Points Manager</h1>
  
  {#if !isAuthenticated}
    <div class="auth-section">
      <h2>Enter Your Password</h2>
      <p>Your password is used to encrypt/decrypt your data. The server cannot read your data.</p>
      
      <div class="password-form">
        <input
          type="password"
          bind:value={password}
          placeholder="Enter your password"
          on:keydown={(e) => e.key === 'Enter' && setPassword()}
        />
        <button on:click={setPassword} disabled={!password.trim()}>
          Set Password
        </button>
      </div>
    </div>
  {:else}
    <div class="points-section">
      <div class="header">
        <h2>Your Encrypted Points</h2>
        <button on:click={() => { isAuthenticated = false; password = ''; points = []; }}>
          Change Password
        </button>
      </div>

      {#if error}
        <div class="error">{error}</div>
      {/if}

      <!-- Create new point form -->
      <div class="create-form">
        <h3>Add New Point</h3>
        <div class="form-grid">
          <input
            type="date"
            bind:value={newPoint.date}
            placeholder="Date"
          />
          <input
            type="text"
            bind:value={newPoint.title}
            placeholder="Title"
          />
          <textarea
            bind:value={newPoint.description}
            placeholder="Description"
          />
          <button on:click={createPoint} disabled={loading || !newPoint.date || !newPoint.title || !newPoint.description}>
            {loading ? 'Creating...' : 'Create Point'}
          </button>
        </div>
      </div>

      <!-- Points list -->
      <div class="points-list">
        <h3>Your Points ({points.length})</h3>
        
        {#if loading && points.length === 0}
          <div class="loading">Loading your encrypted points...</div>
        {:else if points.length === 0}
          <div class="empty">No points yet. Create your first encrypted point above!</div>
        {:else}
          {#each points as point (point.id)}
            <div class="point-card">
              {#if editingPoint?.id === point.id}
                <!-- Edit form -->
                <div class="edit-form">
                  <input type="date" bind:value={editForm.date} />
                  <input type="text" bind:value={editForm.title} />
                  <textarea bind:value={editForm.description} />
                  <div class="edit-actions">
                    <button on:click={updatePoint} disabled={loading}>
                      {loading ? 'Saving...' : 'Save'}
                    </button>
                    <button on:click={cancelEdit} disabled={loading}>Cancel</button>
                  </div>
                </div>
              {:else}
                <!-- Display point -->
                <div class="point-content">
                  <div class="point-header">
                    <strong>{point.title}</strong>
                    <span class="date">{new Date(point.date).toLocaleDateString()}</span>
                  </div>
                  <p class="description">{point.description}</p>
                  <div class="point-actions">
                    <button on:click={() => startEdit(point)}>Edit</button>
                    <button on:click={() => deletePoint(point.id!)} class="delete">
                      Delete
                    </button>
                  </div>
                </div>
              {/if}
            </div>
          {/each}
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .container {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  h1 {
    text-align: center;
    color: #333;
    margin-bottom: 30px;
  }

  .auth-section {
    text-align: center;
    max-width: 400px;
    margin: 0 auto;
  }

  .auth-section h2 {
    color: #555;
    margin-bottom: 10px;
  }

  .auth-section p {
    color: #666;
    margin-bottom: 20px;
    line-height: 1.5;
  }

  .password-form {
    display: flex;
    gap: 10px;
    justify-content: center;
  }

  .password-form input {
    padding: 12px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 16px;
    min-width: 200px;
  }

  .password-form button {
    padding: 12px 20px;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 16px;
  }

  .password-form button:disabled {
    background: #ccc;
    cursor: not-allowed;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }

  .header button {
    padding: 8px 16px;
    background: #6c757d;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  .error {
    background: #f8d7da;
    color: #721c24;
    padding: 12px;
    border-radius: 6px;
    margin-bottom: 20px;
  }

  .create-form {
    background: #f8f9fa;
    padding: 20px;
    border-radius: 8px;
    margin-bottom: 30px;
  }

  .create-form h3 {
    margin-top: 0;
    color: #333;
  }

  .form-grid {
    display: grid;
    gap: 15px;
  }

  .form-grid input,
  .form-grid textarea {
    padding: 12px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 16px;
  }

  .form-grid textarea {
    min-height: 100px;
    resize: vertical;
  }

  .form-grid button {
    padding: 12px;
    background: #28a745;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 16px;
  }

  .form-grid button:disabled {
    background: #ccc;
    cursor: not-allowed;
  }

  .points-list h3 {
    color: #333;
    margin-bottom: 20px;
  }

  .loading,
  .empty {
    text-align: center;
    color: #666;
    padding: 40px;
  }

  .point-card {
    background: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    margin-bottom: 15px;
    overflow: hidden;
  }

  .point-content {
    padding: 20px;
  }

  .point-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }

  .point-header strong {
    font-size: 18px;
    color: #333;
  }

  .date {
    color: #666;
    font-size: 14px;
  }

  .description {
    color: #555;
    line-height: 1.5;
    margin-bottom: 15px;
  }

  .point-actions {
    display: flex;
    gap: 10px;
  }

  .point-actions button {
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
  }

  .point-actions button:first-child {
    background: #007bff;
    color: white;
  }

  .point-actions button.delete {
    background: #dc3545;
    color: white;
  }

  .edit-form {
    padding: 20px;
    display: grid;
    gap: 15px;
  }

  .edit-form input,
  .edit-form textarea {
    padding: 12px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 16px;
  }

  .edit-form textarea {
    min-height: 100px;
    resize: vertical;
  }

  .edit-actions {
    display: flex;
    gap: 10px;
  }

  .edit-actions button {
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
  }

  .edit-actions button:first-child {
    background: #28a745;
    color: white;
  }

  .edit-actions button:last-child {
    background: #6c757d;
    color: white;
  }
</style>
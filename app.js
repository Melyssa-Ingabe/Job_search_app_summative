// API Configuration

const API_CONFIG = {
  adzuna: {
    appId: 'c9bf5f35',      
    apiKey: 'cb0b83d5d1113de5b7980ad6438637e9',    
    baseUrl: 'https://api.adzuna.com/v1/api/jobs'
  },
  jsearch: {
    apiKey: '5232c74cf2msh3085c2fd7c46620p130156jsn5e65fb3341f0',   
    baseUrl: 'https://jsearch.p.rapidapi.com'
  }
};

// application state

const state = {
  currentView: 'search',
  jobs: [],
  filteredJobs: [],
  bookmarkedJobs: [],
  searchQuery: '',
  location: '',
  filters: {
    jobTypes: [],
    datePosted: '',
    minSalary: ''
  },
  sortBy: 'relevance',
  isLoading: false,
  currentPage: 1,
  cache: {
    data: null,
    timestamp: null,
    query: null
  }
};

// Elements

const elements = {
  // Navigation
  navBtns: document.querySelectorAll('.nav-btn'),
  searchView: document.getElementById('search-view'),
  bookmarksView: document.getElementById('bookmarks-view'),
  bookmarkCount: document.querySelector('.bookmark-count'),
  
  // Search
  jobSearchInput: document.getElementById('job-search'),
  locationSearchInput: document.getElementById('location-search'),
  searchBtn: document.getElementById('search-btn'),
  
  // Filters
  filterToggle: document.getElementById('filter-toggle'),
  filtersPanel: document.getElementById('filters-panel'),
  jobTypeFilters: document.querySelectorAll('.job-type-filter'),
  dateFilter: document.getElementById('date-filter'),
  salaryFilter: document.getElementById('salary-filter'),
  clearFiltersBtn: document.getElementById('clear-filters'),
  activeFiltersCount: document.querySelector('.active-filters'),
  
  // Results
  resultsTitle: document.getElementById('results-title'),
  resultsCount: document.getElementById('results-count'),
  sortSelect: document.getElementById('sort-select'),
  jobsList: document.getElementById('jobs-list'),
  loadMoreBtn: document.getElementById('load-more-btn'),
  loadMoreContainer: document.getElementById('load-more-container'),
  
  // States
  loading: document.getElementById('loading'),
  errorMessage: document.getElementById('error-message'),
  errorText: document.getElementById('error-text'),
  retryBtn: document.getElementById('retry-btn'),
  noResults: document.getElementById('no-results'),
  
  // Bookmarks
  bookmarksList: document.getElementById('bookmarks-list'),
  bookmarksEmpty: document.getElementById('bookmarks-empty'),
  clearBookmarksBtn: document.getElementById('clear-bookmarks'),
  
  // Modal
  modal: document.getElementById('job-modal'),
  modalClose: document.getElementById('modal-close'),
  modalBody: document.getElementById('modal-body')
};

// Format date to current time
function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
}

// Format salary
function formatSalary(min, max, currency = 'USD') {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0
  });
  
  if (min && max) {
    return `${formatter.format(min)} - ${formatter.format(max)}`;
  } else if (min) {
    return `${formatter.format(min)}+`;
  }
  return 'Salary not specified';
}

// Truncate text
function truncateText(text, maxLength = 150) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

// Remove HTML tags
function stripHtml(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

// Generate unique ID
function generateId(title, company) {
  return `${title}-${company}`.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Cache management (5 minutes)
function isCacheValid() {
  if (!state.cache.timestamp) return false;
  const fiveMinutes = 5 * 60 * 1000;
  return Date.now() - state.cache.timestamp < fiveMinutes;
}

// API Functions

// jobs from Adzuna
async function fetchAdzunaJobs(query, location = '', page = 1) {
  try {
    const url = `${API_CONFIG.adzuna.baseUrl}/us/search/${page}?` +
      `app_id=${API_CONFIG.adzuna.appId}&` +
      `app_key=${API_CONFIG.adzuna.apiKey}&` +
      `results_per_page=50&` +
      `what=${encodeURIComponent(query)}&` +
      `where=${encodeURIComponent(location || '')}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Adzuna API error: ${response.status}`);
    }
    
    const data = await response.json();
    let jobs = data.results || [];
    
    // Apply strict location filtering if location is provided
    if (location) {
      jobs = jobs.filter(job => {
        const jobLocation = (job.location?.display_name || '').toLowerCase();
        const searchLocation = location.toLowerCase();
        
        // Split search location by comma (e.g., "New York, NY" -> ["new york", "ny"])
        const searchParts = searchLocation.split(',').map(s => s.trim());
        
        // Check if job location contains any part of the search location
        return searchParts.some(part => jobLocation.includes(part));
      });
      
      // Limit to 20 results after filtering
      jobs = jobs.slice(0, 20);
    }
    
    return jobs.map(job => ({
      id: generateId(job.title, job.company.display_name),
      title: job.title,
      company: job.company.display_name,
      location: job.location.display_name,
      description: stripHtml(job.description),
      salary_min: job.salary_min,
      salary_max: job.salary_max,
      contract_type: job.contract_type || 'Not specified',
      created: job.created,
      redirect_url: job.redirect_url,
      category: job.category?.label || 'General',
      source: 'Adzuna'
    }));
  } catch (error) {
    console.error('Adzuna API error:', error);
    return [];
  }
}

// Fetch jobs from JSearch (RapidAPI) with location filtering
async function fetchJSearchJobs(query, location = 'United States') {
  try {
    // Build search query with location
    const searchQuery = location && location !== 'United States'
      ? `${query} in ${location}` 
      : query;
    
    const url = `${API_CONFIG.jsearch.baseUrl}/search?` +
      `query=${encodeURIComponent(searchQuery)}&` +
      `page=1&num_pages=1&date_posted=all`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': API_CONFIG.jsearch.apiKey,
        'X-RapidAPI-Host': 'jsearch.p.rapidapi.com'
      }
    });
    
    if (!response.ok) {
      throw new Error(`JSearch API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.data || data.data.length === 0) return [];
    
    let jobs = data.data;
    
    // Apply location filtering if specified
    if (location && location !== 'United States') {
      jobs = jobs.filter(job => {
        const jobCity = (job.job_city || '').toLowerCase();
        const jobState = (job.job_state || '').toLowerCase();
        const jobLocation = `${jobCity} ${jobState}`.trim();
        const searchLocation = location.toLowerCase();
        const searchParts = searchLocation.split(',').map(s => s.trim());
        
        // Check if job location matches any part of search
        return searchParts.some(part => 
          jobCity.includes(part) || 
          jobState.includes(part) || 
          jobLocation.includes(part)
        );
      });
    }
    
    return jobs.map(job => ({
      id: generateId(job.job_title, job.employer_name),
      title: job.job_title,
      company: job.employer_name,
      location: `${job.job_city || 'Remote'}, ${job.job_state || 'US'}`,
      description: stripHtml(job.job_description || ''),
      salary_min: job.job_min_salary,
      salary_max: job.job_max_salary,
      contract_type: job.job_employment_type || 'Not specified',
      created: job.job_posted_at_datetime_utc || new Date().toISOString(),
      redirect_url: job.job_apply_link,
      category: job.job_category || 'General',
      source: 'JSearch',
      is_remote: job.job_is_remote
    }));
  } catch (error) {
    console.error('JSearch API error:', error);
    return [];
  }
}

// Main search function with combined results
async function searchJobs(query, location = '') {
  // Check cache
  const cacheKey = `${query}-${location}`;
  if (state.cache.query === cacheKey && isCacheValid()) {
    return state.cache.data;
  }
  
  // Fetch from both APIs
  const [adzunaJobs, jsearchJobs] = await Promise.all([
    fetchAdzunaJobs(query, location),
    fetchJSearchJobs(query, location || 'United States')
  ]);
  
  // Combine and deduplicate
  const allJobs = [...adzunaJobs, ...jsearchJobs];
  let uniqueJobs = Array.from(
    new Map(allJobs.map(job => [job.id, job])).values()
  );
  
  // Extra safety filter - ensure location match
  if (location) {
    uniqueJobs = uniqueJobs.filter(job => {
      const jobLoc = job.location.toLowerCase();
      const searchLoc = location.toLowerCase();
      const searchParts = searchLoc.split(',').map(s => s.trim());
      
      // Job must contain at least one part of the search location
      return searchParts.some(part => jobLoc.includes(part));
    });
  }
  
  // Cache results
  state.cache = {
    data: uniqueJobs,
    timestamp: Date.now(),
    query: cacheKey
  };
  
  return uniqueJobs;
}

// Filter and Sort Functions

function applyFilters(jobs) {
  let filtered = [...jobs];
  
  // Job type filter
  if (state.filters.jobTypes.length > 0) {
    filtered = filtered.filter(job => {
      const jobType = job.contract_type.toLowerCase();
      return state.filters.jobTypes.some(type => jobType.includes(type));
    });
  }
  
  // Date filter
  if (state.filters.datePosted) {
    const daysAgo = parseInt(state.filters.datePosted);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
    
    filtered = filtered.filter(job => {
      const jobDate = new Date(job.created);
      return jobDate >= cutoffDate;
    });
  }
  
  // Salary filter
  if (state.filters.minSalary) {
    const minSalary = parseInt(state.filters.minSalary);
    filtered = filtered.filter(job => {
      return job.salary_min && job.salary_min >= minSalary;
    });
  }
  
  return filtered;
}

function sortJobs(jobs) {
  const sorted = [...jobs];
  
  switch (state.sortBy) {
    case 'date':
      return sorted.sort((a, b) => new Date(b.created) - new Date(a.created));
    case 'salary':
      return sorted.sort((a, b) => (b.salary_max || 0) - (a.salary_max || 0));
    case 'relevance':
    default:
      return sorted;
  }
}

// UI update function

function updateBookmarkCount() {
  const count = state.bookmarkedJobs.length;
  elements.bookmarkCount.textContent = count;
  elements.bookmarkCount.style.display = count > 0 ? 'inline-block' : 'none';
}

function updateActiveFiltersCount() {
  let count = 0;
  if (state.filters.jobTypes.length > 0) count++;
  if (state.filters.datePosted) count++;
  if (state.filters.minSalary) count++;
  
  elements.activeFiltersCount.textContent = count;
  elements.activeFiltersCount.style.display = count > 0 ? 'inline-block' : 'none';
  
  if (count > 0) {
    elements.filterToggle.classList.add('active');
  } else {
    elements.filterToggle.classList.remove('active');
  }
}

function showLoading() {
  state.isLoading = true;
  elements.loading.style.display = 'flex';
  elements.jobsList.innerHTML = '';
  elements.errorMessage.style.display = 'none';
  elements.noResults.style.display = 'none';
  elements.loadMoreContainer.style.display = 'none';
}

function hideLoading() {
  state.isLoading = false;
  elements.loading.style.display = 'none';
}

function showError(message) {
  elements.errorText.textContent = message;
  elements.errorMessage.style.display = 'flex';
  elements.jobsList.innerHTML = '';
  elements.noResults.style.display = 'none';
}

function showNoResults() {
  elements.noResults.style.display = 'flex';
  elements.jobsList.innerHTML = '';
  elements.errorMessage.style.display = 'none';
}

// Job card
function createJobCard(job) {
  const isBookmarked = state.bookmarkedJobs.some(b => b.id === job.id);
  
  const card = document.createElement('div');
  card.className = 'job-card';
  card.dataset.jobId = job.id;
  
  card.innerHTML = `
    <div class="job-card-header">
      <div class="job-card-title">
        <h3>${job.title}</h3>
        <p class="company">${job.company}</p>
      </div>
      <div class="job-card-actions">
        <button class="icon-btn bookmark-btn ${isBookmarked ? 'bookmarked' : ''}" 
                title="${isBookmarked ? 'Remove bookmark' : 'Bookmark this job'}">
          <i class="fas fa-bookmark"></i>
        </button>
      </div>
    </div>
    
    <div class="job-card-meta">
      <span class="meta-item">
        <i class="fas fa-map-marker-alt"></i>
        ${job.location}
      </span>
      <span class="meta-item">
        <i class="fas fa-briefcase"></i>
        ${job.contract_type}
      </span>
      <span class="meta-item">
        <i class="fas fa-clock"></i>
        ${formatDate(job.created)}
      </span>
      ${job.source ? `
        <span class="meta-item">
          <i class="fas fa-database"></i>
          ${job.source}
        </span>
      ` : ''}
    </div>
    
    <div class="job-card-description">
      ${truncateText(job.description, 200)}
    </div>
    
    <div class="job-card-tags">
      ${job.salary_min ? `
        <span class="tag salary">
          ${formatSalary(job.salary_min, job.salary_max)}
        </span>
      ` : ''}
      ${job.is_remote ? '<span class="tag remote">Remote</span>' : ''}
      ${job.category ? `<span class="tag">${job.category}</span>` : ''}
    </div>
  `;
  
  // Handler for bookmark button
  const bookmarkBtn = card.querySelector('.bookmark-btn');
  bookmarkBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleBookmark(job);
  });
  
  // Handler for card
  card.addEventListener('click', () => {
    showJobDetails(job);
  });
  
  return card;
}

// Display jobs
function displayJobs(jobs) {
  elements.jobsList.innerHTML = '';
  
  if (jobs.length === 0) {
    showNoResults();
    return;
  }
  
  jobs.forEach(job => {
    const card = createJobCard(job);
    elements.jobsList.appendChild(card);
  });
  
  // Update results header
  elements.resultsTitle.textContent = `${jobs.length} Jobs Found`;
  elements.resultsCount.textContent = 
    `Showing ${jobs.length} job${jobs.length !== 1 ? 's' : ''}`;
}

// Bookmark functions

function loadBookmarks() {
  const saved = localStorage.getItem('jobBookmarks');
  if (saved) {
    state.bookmarkedJobs = JSON.parse(saved);
    updateBookmarkCount();
  }
}

function saveBookmarks() {
  localStorage.setItem('jobBookmarks', JSON.stringify(state.bookmarkedJobs));
  updateBookmarkCount();
}

function toggleBookmark(job) {
  const index = state.bookmarkedJobs.findIndex(b => b.id === job.id);
  
  if (index > -1) {
    state.bookmarkedJobs.splice(index, 1);
  } else {
    state.bookmarkedJobs.push(job);
  }
  
  saveBookmarks();
  
  // Update UI
  if (state.currentView === 'search') {
    displayJobs(state.filteredJobs);
  } else {
    displayBookmarks();
  }
}

function displayBookmarks() {
  elements.bookmarksList.innerHTML = '';
  
  if (state.bookmarkedJobs.length === 0) {
    elements.bookmarksEmpty.style.display = 'flex';
    return;
  }
  
  elements.bookmarksEmpty.style.display = 'none';
  
  state.bookmarkedJobs.forEach(job => {
    const card = createJobCard(job);
    elements.bookmarksList.appendChild(card);
  });
}

function clearAllBookmarks() {
  if (confirm('Are you sure you want to remove all bookmarked jobs?')) {
    state.bookmarkedJobs = [];
    saveBookmarks();
    displayBookmarks();
  }
}

// Modal functions

function showJobDetails(job) {
  elements.modalBody.innerHTML = `
    <div style="padding-right: 3rem;">
      <div style="margin-bottom: 2rem;">
        <h2 style="font-size: 2rem; margin-bottom: 0.5rem;">${job.title}</h2>
        <p style="font-size: 1.25rem; color: var(--text-secondary); font-weight: 500;">
          ${job.company}
        </p>
      </div>
      
      <div style="display: flex; flex-wrap: wrap; gap: 1rem; margin-bottom: 2rem; 
                  padding: 1rem; background-color: var(--bg-tertiary); border-radius: var(--radius-md);">
        <span class="meta-item">
          <i class="fas fa-map-marker-alt"></i>
          ${job.location}
        </span>
        <span class="meta-item">
          <i class="fas fa-briefcase"></i>
          ${job.contract_type}
        </span>
        <span class="meta-item">
          <i class="fas fa-clock"></i>
          Posted ${formatDate(job.created)}
        </span>
        ${job.salary_min ? `
          <span class="meta-item">
            <i class="fas fa-dollar-sign"></i>
            ${formatSalary(job.salary_min, job.salary_max)}
          </span>
        ` : ''}
      </div>
      
      <div style="margin-bottom: 2rem;">
        <h3 style="font-size: 1.25rem; margin-bottom: 1rem;">Job Description</h3>
        <div style="line-height: 1.8; color: var(--text-secondary);">
          ${job.description}
        </div>
      </div>
      
      ${job.category ? `
        <div style="margin-bottom: 2rem;">
          <h3 style="font-size: 1.25rem; margin-bottom: 1rem;">Category</h3>
          <span class="tag">${job.category}</span>
        </div>
      ` : ''}
      
      <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
        <a href="${job.redirect_url}" target="_blank" rel="noopener noreferrer" 
           class="btn btn-primary" style="text-decoration: none;">
          <i class="fas fa-external-link-alt"></i>
          Apply Now
        </a>
        <button class="btn btn-secondary" onclick="window.toggleBookmarkFromModal('${job.id}')">
          <i class="fas fa-bookmark"></i>
          ${state.bookmarkedJobs.some(b => b.id === job.id) ? 'Remove Bookmark' : 'Bookmark Job'}
        </button>
      </div>
    </div>
  `;
  
  elements.modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  elements.modal.classList.remove('active');
  document.body.style.overflow = '';
}

// Function for bookmark toggle
window.toggleBookmarkFromModal = function(jobId) {
  const job = [...state.jobs, ...state.bookmarkedJobs].find(j => j.id === jobId);
  if (job) {
    toggleBookmark(job);
    // Refresh modal content
    showJobDetails(job);
  }
};

// Search and Filter Handlers

async function handleSearch() {
  const query = elements.jobSearchInput.value.trim();
  const location = elements.locationSearchInput.value.trim();
  
  if (!query) {
    showError('Please enter a job title or keyword');
    return;
  }
  
  state.searchQuery = query;
  state.location = location;
  
  showLoading();
  
  try {
    const jobs = await searchJobs(query, location);
    
    if (jobs.length === 0) {
      hideLoading();
      showNoResults();
      return;
    }
    
    state.jobs = jobs;
    state.filteredJobs = applyFilters(state.jobs);
    state.filteredJobs = sortJobs(state.filteredJobs);
    
    hideLoading();
    displayJobs(state.filteredJobs);
    
  } catch (error) {
    hideLoading();
    showError('Failed to fetch jobs. Please check your API keys and try again.');
    console.error('Search error:', error);
  }
}

function handleFilterChange() {
  // Update filter
  state.filters.jobTypes = Array.from(elements.jobTypeFilters)
    .filter(checkbox => checkbox.checked)
    .map(checkbox => checkbox.value);
  
  state.filters.datePosted = elements.dateFilter.value;
  state.filters.minSalary = elements.salaryFilter.value;
  
  // Apply filter
  if (state.jobs.length > 0) {
    state.filteredJobs = applyFilters(state.jobs);
    state.filteredJobs = sortJobs(state.filteredJobs);
    displayJobs(state.filteredJobs);
  }
  
  updateActiveFiltersCount();
}

function clearFilters() {
  // Reset filter
  state.filters = {
    jobTypes: [],
    datePosted: '',
    minSalary: ''
  };
  
  // Reset UI
  elements.jobTypeFilters.forEach(checkbox => checkbox.checked = false);
  elements.dateFilter.value = '';
  elements.salaryFilter.value = '';
  
  // Reapply
  if (state.jobs.length > 0) {
    state.filteredJobs = applyFilters(state.jobs);
    state.filteredJobs = sortJobs(state.filteredJobs);
    displayJobs(state.filteredJobs);
  }
  
  updateActiveFiltersCount();
}

function handleSortChange() {
  state.sortBy = elements.sortSelect.value;
  state.filteredJobs = sortJobs(state.filteredJobs);
  displayJobs(state.filteredJobs);
}

// Navigation

function switchView(view) {
  state.currentView = view;
  
  // Update nav buttons
  elements.navBtns.forEach(btn => {
    if (btn.dataset.view === view) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  
  // Update views
  if (view === 'search') {
    elements.searchView.classList.add('active');
    elements.bookmarksView.classList.remove('active');
  } else if (view === 'bookmarks') {
    elements.searchView.classList.remove('active');
    elements.bookmarksView.classList.add('active');
    displayBookmarks();
  }
}

// Event listener

function initEventListeners() {
  // Navigation
  elements.navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      switchView(btn.dataset.view);
    });
  });
  
  // Search
  elements.searchBtn.addEventListener('click', handleSearch);
  elements.jobSearchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
  });
  elements.locationSearchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
  });
  
  // Filters
  elements.filterToggle.addEventListener('click', () => {
    elements.filtersPanel.classList.toggle('active');
  });
  
  elements.jobTypeFilters.forEach(checkbox => {
    checkbox.addEventListener('change', handleFilterChange);
  });
  
  elements.dateFilter.addEventListener('change', handleFilterChange);
  elements.salaryFilter.addEventListener('change', handleFilterChange);
  elements.clearFiltersBtn.addEventListener('click', clearFilters);
  
  // Sort
  elements.sortSelect.addEventListener('change', handleSortChange);
  
  // Bookmarks
  elements.clearBookmarksBtn.addEventListener('click', clearAllBookmarks);
  
  // Modal
  elements.modalClose.addEventListener('click', closeModal);
  elements.modal.addEventListener('click', (e) => {
    if (e.target === elements.modal) closeModal();
  });
  
  // Error retry
  elements.retryBtn.addEventListener('click', handleSearch);
  
  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && elements.modal.classList.contains('active')) {
      closeModal();
    }
  });
}

// Initialization

function init() {
  console.log('JobFinder Pro initialized');
  
  // Load bookmarks from localStorage
  loadBookmarks();
  
  // Initialize event listeners
  initEventListeners();
  
  // Check for API keys
  if (API_CONFIG.adzuna.appId === 'YOUR_ADZUNA_APP_ID' || 
      API_CONFIG.jsearch.apiKey === 'YOUR_RAPIDAPI_KEY') {
    console.warn('⚠️ API keys not configured! Please add your API keys in app.js');
    showError('API keys not configured. Please add your API keys in the app.js file.');
  }
}

// Start the application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
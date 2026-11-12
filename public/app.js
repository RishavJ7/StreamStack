// ==================== STREAMSTACK FRONTEND APP ====================

const API_BASE = "/api/v1";

// State
let currentUser = null;
let currentTab = "home";
let currentVideo = null;

// DOM Elements
const views = {
  home: document.getElementById("home-view"),
  watch: document.getElementById("watch-view"),
  tweets: document.getElementById("tweets-view"),
  liked: document.getElementById("liked-view"),
  history: document.getElementById("history-view")
};

// ==================== UTILS ====================
function getAuthHeader() {
  const token = localStorage.getItem("streamstack_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerText = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

function timeAgo(dateString) {
  if (!dateString) return "recently";
  const date = new Date(dateString);
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 60) return "just now";
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

// ==================== ROUTING / TAB SWITCHING ====================
function switchTab(tab) {
  currentTab = tab;
  Object.keys(views).forEach(k => {
    if (views[k]) views[k].style.display = k === tab ? "block" : "none";
  });

  document.querySelectorAll(".nav-item").forEach(item => {
    item.classList.toggle("active", item.dataset.tab === tab);
  });

  if (tab === "home") loadVideos();
  if (tab === "tweets") loadTweets();
  if (tab === "liked") loadLikedVideos();
  if (tab === "history") loadWatchHistory();
}

// ==================== AUTHENTICATION ====================
async function checkAuth() {
  const token = localStorage.getItem("streamstack_token");
  if (!token) {
    updateAuthUI(null);
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/users/current-user`, {
      headers: getAuthHeader()
    });
    const data = await res.json();
    if (data.success && data.data) {
      currentUser = data.data;
      updateAuthUI(currentUser);
    } else {
      logout(false);
    }
  } catch (err) {
    console.error("Auth check failed:", err);
  }
}

function updateAuthUI(user) {
  const authSection = document.getElementById("header-auth-section");
  if (user) {
    authSection.innerHTML = `
      <div class="user-profile-badge" title="${user.fullName} (@${user.username})">
        <img class="user-avatar" src="${user.avatar || 'https://via.placeholder.com/32'}" alt="${user.username}" />
        <span style="font-weight: 600; font-size: 0.9rem;">${user.username}</span>
      </div>
      <button class="btn btn-secondary" onclick="logout(true)">Logout</button>
    `;
  } else {
    authSection.innerHTML = `
      <button class="btn btn-blue" onclick="openModal('auth-modal')">Sign In</button>
    `;
  }
}

async function login(usernameOrEmail, password) {
  try {
    const body = usernameOrEmail.includes("@") 
      ? { email: usernameOrEmail, password } 
      : { username: usernameOrEmail, password };

    const res = await fetch(`${API_BASE}/users/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.message || "Login failed");
    }

    localStorage.setItem("streamstack_token", data.data.accessToken);
    currentUser = data.data.user;
    updateAuthUI(currentUser);
    closeModal("auth-modal");
    showToast(`Welcome back, ${currentUser.username}!`, "success");
    switchTab("home");
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function register(formData) {
  try {
    const res = await fetch(`${API_BASE}/users/register`, {
      method: "POST",
      body: formData
    });
    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.message || "Registration failed");
    }

    showToast("Registration successful! Logging you in...", "success");
    const username = formData.get("username");
    const password = formData.get("password");
    await login(username, password);
  } catch (err) {
    showToast(err.message, "error");
  }
}

function logout(notify = true) {
  localStorage.removeItem("streamstack_token");
  currentUser = null;
  updateAuthUI(null);
  if (notify) showToast("Logged out successfully", "info");
  switchTab("home");
}

// ==================== VIDEOS ====================
async function loadVideos(query = "") {
  const container = document.getElementById("video-grid");
  container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-secondary);">Loading videos...</div>`;

  try {
    const url = query 
      ? `${API_BASE}/videos/get-all-videos?query=${encodeURIComponent(query)}` 
      : `${API_BASE}/videos/get-all-videos`;

    const res = await fetch(url);
    const data = await res.json();

    const videoList = data.data?.videos || [];

    if (videoList.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column: 1/-1;">
          <h3>No videos found</h3>
          <p style="margin-bottom: 16px;">Be the first creator to share a video on StreamStack!</p>
          <button class="btn btn-blue" onclick="openUploadModal()">Upload Video</button>
        </div>
      `;
      return;
    }

    container.innerHTML = videoList.map(v => `
      <div class="video-card" onclick="openWatchView('${v._id}')">
        <div class="thumbnail-wrapper">
          <img class="thumbnail-img" src="${v.thumbnail || 'https://via.placeholder.com/320x180'}" alt="${v.title}" />
          <span class="duration-badge">${formatDuration(v.duration)}</span>
        </div>
        <div class="video-info">
          <img class="channel-avatar" src="${v.uploader?.[0]?.avatar || 'https://via.placeholder.com/36'}" alt="uploader" />
          <div class="video-details">
            <h4 class="video-title">${v.title}</h4>
            <div class="video-meta">${v.uploader?.[0]?.fullName || v.uploader?.[0]?.username || "Creator"}</div>
            <div class="video-meta">${v.views || 0} views &bull; ${timeAgo(v.createdAt)}</div>
          </div>
        </div>
      </div>
    `).join("");
  } catch (err) {
    container.innerHTML = `<div style="grid-column: 1/-1; color: var(--accent-red); padding: 20px;">Failed to load videos: ${err.message}</div>`;
  }
}

async function openWatchView(videoId) {
  switchTab("watch");
  const watchSection = document.getElementById("watch-view");
  watchSection.innerHTML = `<div style="text-align: center; padding: 40px;">Loading video player...</div>`;

  try {
    const res = await fetch(`${API_BASE}/videos/get-video/${videoId}`, {
      headers: getAuthHeader()
    });
    const data = await res.json();
    if (!data.success || !data.data) {
      throw new Error(data.message || "Failed to load video");
    }

    const video = Array.isArray(data.data) ? data.data[0] : data.data;
    currentVideo = video;

    const uploader = video.uploader || {};
    const isLiked = video.isLiked || false;
    const likesCount = video.likesCount || 0;

    watchSection.innerHTML = `
      <div class="watch-container">
        <div class="player-section">
          <div class="video-player-wrapper">
            <video src="${video.videoFile}" controls autoplay playsinline></video>
          </div>
          <h1 class="watch-title">${video.title}</h1>
          <div class="watch-actions-bar">
            <div class="channel-meta">
              <img class="channel-avatar" style="width: 44px; height: 44px;" src="${uploader.avatar || 'https://via.placeholder.com/44'}" alt="${uploader.username}" />
              <div>
                <div style="font-weight: 700; font-size: 1rem;">${uploader.fullName || uploader.username || "Creator"}</div>
                <div style="color: var(--text-secondary); font-size: 0.85rem;">@${uploader.username || "channel"}</div>
              </div>
              <button class="btn btn-secondary" onclick="toggleSubscribe('${uploader._id}')" style="margin-left: 12px;">Subscribe</button>
            </div>
            <div class="action-buttons">
              <button id="like-btn" class="btn btn-like ${isLiked ? 'liked' : ''}" onclick="toggleVideoLike('${video._id}')">
                ❤️ <span id="like-count">${likesCount}</span> Likes
              </button>
              <button class="btn btn-secondary" onclick="shareVideo('${video._id}')">🔗 Share</button>
            </div>
          </div>

          <div class="description-box">
            <div style="font-weight: 700; margin-bottom: 6px;">${video.views || 0} views &bull; Uploaded ${timeAgo(video.createdAt)}</div>
            ${video.description || "No description provided."}
          </div>

          <!-- Comments Section -->
          <div class="comments-section">
            <div class="comments-header">Comments</div>
            <div class="comment-input-box">
              <img class="channel-avatar" src="${currentUser?.avatar || 'https://via.placeholder.com/36'}" alt="user" />
              <input type="text" id="new-comment-input" class="comment-input" placeholder="Add a comment..." onkeydown="if(event.key==='Enter') submitComment('${video._id}')" />
              <button class="btn btn-primary" onclick="submitComment('${video._id}')">Comment</button>
            </div>
            <div id="comments-list">Loading comments...</div>
          </div>
        </div>
      </div>
    `;

    loadComments(video._id);
  } catch (err) {
    watchSection.innerHTML = `<div style="color: var(--accent-red); padding: 40px;">Error: ${err.message}</div>`;
  }
}

async function toggleVideoLike(videoId) {
  if (!currentUser) {
    openModal("auth-modal");
    showToast("Please sign in to like videos", "info");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/likes/toggle-video-like/${videoId}`, {
      headers: getAuthHeader()
    });
    const data = await res.json();
    if (data.success) {
      const btn = document.getElementById("like-btn");
      const countEl = document.getElementById("like-count");
      let count = parseInt(countEl.innerText) || 0;

      if (btn.classList.contains("liked")) {
        btn.classList.remove("liked");
        countEl.innerText = Math.max(0, count - 1);
      } else {
        btn.classList.add("liked");
        countEl.innerText = count + 1;
      }
    }
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function toggleSubscribe(channelId) {
  if (!currentUser) {
    openModal("auth-modal");
    showToast("Please sign in to subscribe", "info");
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/subscriptions/c/${channelId}`, {
      headers: getAuthHeader()
    });
    const data = await res.json();
    showToast(data.message || "Subscription updated", "success");
  } catch (err) {
    showToast(err.message, "error");
  }
}

function shareVideo(videoId) {
  const url = window.location.origin + `?v=${videoId}`;
  navigator.clipboard.writeText(url);
  showToast("Video link copied to clipboard!", "success");
}

// ==================== COMMENTS ====================
async function loadComments(videoId) {
  const container = document.getElementById("comments-list");
  try {
    const res = await fetch(`${API_BASE}/comments/get-all-video-comments/${videoId}`, {
      headers: getAuthHeader()
    });
    const data = await res.json();
    const comments = data.data?.comments || data.data || [];

    if (!Array.isArray(comments) || comments.length === 0) {
      container.innerHTML = `<div style="color: var(--text-secondary); font-size: 0.9rem;">No comments yet. Be the first to comment!</div>`;
      return;
    }

    container.innerHTML = comments.map(c => `
      <div class="comment-item">
        <img class="channel-avatar" style="width: 32px; height: 32px;" src="${c.uploader?.avatar || 'https://via.placeholder.com/32'}" alt="avatar" />
        <div>
          <div class="comment-author">${c.uploader?.fullName || c.uploader?.username || 'User'} <span style="font-weight: 400; color: var(--text-secondary); font-size: 0.8rem;">&bull; ${timeAgo(c.createdAt)}</span></div>
          <div class="comment-text">${c.content}</div>
        </div>
      </div>
    `).join("");
  } catch (err) {
    container.innerHTML = `<div style="color: var(--text-muted);">Failed to load comments</div>`;
  }
}

async function submitComment(videoId) {
  if (!currentUser) {
    openModal("auth-modal");
    showToast("Please sign in to comment", "info");
    return;
  }

  const input = document.getElementById("new-comment-input");
  const content = input.value.trim();
  if (!content) return;

  try {
    const res = await fetch(`${API_BASE}/comments/add-comment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader()
      },
      body: JSON.stringify({ content, videoId })
    });
    const data = await res.json();
    if (data.success) {
      input.value = "";
      loadComments(videoId);
      showToast("Comment posted!", "success");
    } else {
      showToast(data.message, "error");
    }
  } catch (err) {
    showToast(err.message, "error");
  }
}

// ==================== TWEETS ====================
async function loadTweets() {
  const container = document.getElementById("tweets-feed");
  container.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--text-secondary);">Loading tweets...</div>`;

  try {
    // If user is logged in, load tweets; otherwise show prompt
    if (!currentUser) {
      container.innerHTML = `
        <div class="empty-state">
          <h3>Community Tweets</h3>
          <p style="margin-bottom: 16px;">Sign in to view, create, and like community tweets.</p>
          <button class="btn btn-blue" onclick="openModal('auth-modal')">Sign In</button>
        </div>
      `;
      return;
    }

    const res = await fetch(`${API_BASE}/tweets/get-user-tweets/${currentUser._id}`, {
      headers: getAuthHeader()
    });
    const data = await res.json();
    const tweetList = data.data?.docs || data.data || [];

    if (!Array.isArray(tweetList) || tweetList.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <h3>No tweets yet</h3>
          <p>Post the first tweet above!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = tweetList.map(t => `
      <div class="tweet-card">
        <img class="channel-avatar" src="${t.owner?.avatar || currentUser.avatar || 'https://via.placeholder.com/40'}" alt="avatar" />
        <div class="tweet-body">
          <div class="tweet-header">
            <span class="tweet-author">${t.owner?.fullName || currentUser.fullName}</span>
            <span class="tweet-username">@${t.owner?.username || currentUser.username} &bull; ${timeAgo(t.createdAt)}</span>
          </div>
          <div class="tweet-content">${t.content}</div>
          <div class="tweet-actions">
            <button class="tweet-action-btn" onclick="toggleTweetLike('${t._id}')">
              ❤️ ${t.likesCount || 0}
            </button>
          </div>
        </div>
      </div>
    `).join("");
  } catch (err) {
    container.innerHTML = `<div style="color: var(--text-muted); padding: 20px;">No tweets to display right now.</div>`;
  }
}

async function postTweet() {
  if (!currentUser) {
    openModal("auth-modal");
    showToast("Please sign in to tweet", "info");
    return;
  }

  const textarea = document.getElementById("tweet-compose-text");
  const content = textarea.value.trim();
  if (!content) return;

  try {
    const res = await fetch(`${API_BASE}/tweets/create-tweet`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader()
      },
      body: JSON.stringify({ content })
    });
    const data = await res.json();
    if (data.success) {
      textarea.value = "";
      showToast("Tweet posted!", "success");
      loadTweets();
    } else {
      showToast(data.message, "error");
    }
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function toggleTweetLike(tweetId) {
  if (!currentUser) {
    openModal("auth-modal");
    showToast("Please sign in to like tweets", "info");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/likes/toggle-tweet-like/${tweetId}`, {
      headers: getAuthHeader()
    });
    const data = await res.json();
    if (data.success) {
      loadTweets();
    }
  } catch (err) {
    showToast(err.message, "error");
  }
}

// ==================== WATCH HISTORY & LIKES ====================
async function loadWatchHistory() {
  const container = document.getElementById("history-list");
  if (!currentUser) {
    container.innerHTML = `<div class="empty-state"><h3>Sign in to view your watch history</h3><button class="btn btn-blue" onclick="openModal('auth-modal')" style="margin-top: 12px;">Sign In</button></div>`;
    return;
  }

  container.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--text-secondary);">Loading history...</div>`;
  try {
    const res = await fetch(`${API_BASE}/users/history`, {
      headers: getAuthHeader()
    });
    const data = await res.json();
    const history = data.data || [];

    if (history.length === 0) {
      container.innerHTML = `<div class="empty-state"><h3>No watch history found</h3><p>Videos you watch will show up here.</p></div>`;
      return;
    }

    container.innerHTML = `
      <div class="video-grid">
        ${history.map(v => `
          <div class="video-card" onclick="openWatchView('${v._id}')">
            <div class="thumbnail-wrapper">
              <img class="thumbnail-img" src="${v.thumbnail || 'https://via.placeholder.com/320x180'}" alt="${v.title}" />
              <span class="duration-badge">${formatDuration(v.duration)}</span>
            </div>
            <div class="video-info">
              <div class="video-details">
                <h4 class="video-title">${v.title}</h4>
                <div class="video-meta">${v.views || 0} views &bull; ${timeAgo(v.createdAt)}</div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div style="color: var(--accent-red);">Failed to load history</div>`;
  }
}

async function loadLikedVideos() {
  const container = document.getElementById("liked-list");
  if (!currentUser) {
    container.innerHTML = `<div class="empty-state"><h3>Sign in to view your liked videos</h3><button class="btn btn-blue" onclick="openModal('auth-modal')" style="margin-top: 12px;">Sign In</button></div>`;
    return;
  }

  container.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--text-secondary);">Loading liked videos...</div>`;
  try {
    const res = await fetch(`${API_BASE}/likes/toggle-liked-video`, {
      headers: getAuthHeader()
    });
    const data = await res.json();
    const likes = data.data || [];

    if (likes.length === 0) {
      container.innerHTML = `<div class="empty-state"><h3>No liked videos yet</h3><p>Tap the heart icon on any video to save it here.</p></div>`;
      return;
    }

    container.innerHTML = `
      <div class="video-grid">
        ${likes.map(l => {
          const v = l.video || l;
          return `
            <div class="video-card" onclick="openWatchView('${v._id}')">
              <div class="thumbnail-wrapper">
                <img class="thumbnail-img" src="${v.thumbnail || 'https://via.placeholder.com/320x180'}" alt="${v.title}" />
                <span class="duration-badge">${formatDuration(v.duration)}</span>
              </div>
              <div class="video-info">
                <div class="video-details">
                  <h4 class="video-title">${v.title}</h4>
                  <div class="video-meta">${v.views || 0} views</div>
                </div>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div style="color: var(--accent-red);">Failed to load liked videos</div>`;
  }
}

// ==================== UPLOAD VIDEO MODAL ====================
function openUploadModal() {
  if (!currentUser) {
    openModal("auth-modal");
    showToast("Please sign in to upload videos", "info");
    return;
  }
  openModal("upload-modal");
}

async function handleVideoUpload(e) {
  e.preventDefault();
  const form = document.getElementById("upload-video-form");
  const formData = new FormData(form);

  const btn = document.getElementById("upload-submit-btn");
  btn.disabled = true;
  btn.innerText = "Uploading to Cloudinary (this may take a minute)...";

  try {
    const res = await fetch(`${API_BASE}/videos/upload-video`, {
      method: "POST",
      headers: getAuthHeader(),
      body: formData
    });
    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.message || "Failed to upload video");
    }

    showToast("Video published successfully!", "success");
    form.reset();
    closeModal("upload-modal");
    switchTab("home");
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    btn.disabled = false;
    btn.innerText = "Publish Video";
  }
}

// ==================== MODAL HELPERS ====================
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add("active");
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove("active");
}

function switchAuthTab(type) {
  const isLogin = type === "login";
  document.getElementById("auth-tab-login").classList.toggle("active", isLogin);
  document.getElementById("auth-tab-register").classList.toggle("active", !isLogin);
  document.getElementById("login-form").style.display = isLogin ? "block" : "none";
  document.getElementById("register-form").style.display = !isLogin ? "block" : "none";
}

// ==================== INITIALIZATION ====================
document.addEventListener("DOMContentLoaded", () => {
  checkAuth();
  loadVideos();

  // Search input handler
  const searchInput = document.getElementById("search-input");
  let debounceTimeout;
  searchInput.addEventListener("input", () => {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      switchTab("home");
      loadVideos(searchInput.value.trim());
    }, 400);
  });
});

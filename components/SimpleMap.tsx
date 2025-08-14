// // DEPRECATED: This component uses WebView which causes registration conflicts
// // Use NativeMap.tsx instead for better performance and no WebView dependency
// /*
// import React from 'react';
// import { StyleSheet, View, Dimensions } from 'react-native';
// import { WebView } from 'react-native-webview';

// interface SimpleMapProps {
//   navigationParams?: any;
// }

// const SimpleMap = ({ navigationParams }: SimpleMapProps) => {
//   const mapHTML = `
//     <!DOCTYPE html>
//     <html>
//     <head>
//         <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
//         <style>
//             * {
//                 box-sizing: border-box;
//             }
            
//             body, html {
//                 margin: 0;
//                 padding: 0;
//                 height: 100%;
//                 font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
//                 background: #ffffff;
//                 -webkit-font-smoothing: antialiased;
//                 -moz-osx-font-smoothing: grayscale;
//                 overflow: hidden;
//             }
            
//             #map {
//                 height: 100vh;
//                 width: 100vw;
//                 position: relative;
//             }
            
//             /* Enhanced Search Bar */
//             .search-container {
//                 position: absolute;
//                 top: env(safe-area-inset-top, 50px);
//                 left: 16px;
//                 right: 16px;
//                 z-index: 1001;
//                 max-width: 400px;
//                 margin: 0 auto;
//             }
            
//             .search-box {
//                 background: rgba(255, 255, 255, 0.95);
//                 backdrop-filter: blur(20px);
//                 -webkit-backdrop-filter: blur(20px);
//                 border-radius: 16px;
//                 border: 1px solid rgba(0, 0, 0, 0.06);
//                 overflow: hidden;
//                 transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
//                 box-shadow: 
//                     0 1px 3px rgba(0, 0, 0, 0.1),
//                     0 4px 20px rgba(0, 0, 0, 0.08);
//             }
            
//             .search-box:focus-within {
//                 background: rgba(255, 255, 255, 0.98);
//                 box-shadow: 
//                     0 4px 8px rgba(0, 0, 0, 0.12),
//                     0 8px 24px rgba(0, 0, 0, 0.15);
//                 transform: translateY(-1px);
//                 border-color: rgba(0, 122, 255, 0.2);
//             }
            
//             .search-input {
//                 width: 100%;
//                 padding: 14px 16px 14px 44px;
//                 border: none;
//                 outline: none;
//                 font-size: 16px;
//                 font-weight: 400;
//                 color: #1d1d1f;
//                 background: transparent;
//                 border-radius: 16px;
//                 line-height: 1.4;
//             }
            
//             .search-input::placeholder {
//                 color: #86868b;
//                 font-weight: 400;
//             }
            
//             .search-icon {
//                 position: absolute;
//                 left: 16px;
//                 top: 50%;
//                 transform: translateY(-50%);
//                 width: 16px;
//                 height: 16px;
//                 background: #86868b;
//                 mask: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3e%3ccircle cx='11' cy='11' r='8'/%3e%3cPath d='m21 21-4.35-4.35'/%3e%3c/svg%3e") no-repeat center;
//                 mask-size: contain;
//                 pointer-events: none;
//             }
            
//             .search-results {
//                 background: rgba(255, 255, 255, 0.98);
//                 backdrop-filter: blur(20px);
//                 -webkit-backdrop-filter: blur(20px);
//                 border-radius: 0 0 16px 16px;
//                 border: 1px solid rgba(0, 0, 0, 0.06);
//                 border-top: none;
//                 max-height: 280px;
//                 overflow-y: auto;
//                 display: none;
//                 box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
//             }
            
//             .search-result-item {
//                 padding: 12px 16px;
//                 cursor: pointer;
//                 display: flex;
//                 align-items: center;
//                 gap: 12px;
//                 transition: background-color 0.2s ease;
//                 border-bottom: 1px solid rgba(0, 0, 0, 0.05);
//                 min-height: 56px;
//             }
            
//             .search-result-item:hover {
//                 background-color: rgba(0, 122, 255, 0.04);
//             }
            
//             .search-result-item:last-child {
//                 border-bottom: none;
//                 border-radius: 0 0 16px 16px;
//             }
            
//             .result-icon {
//                 font-size: 18px;
//                 width: 20px;
//                 text-align: center;
//                 flex-shrink: 0;
//             }
            
//             .result-content {
//                 flex: 1;
//                 min-width: 0;
//             }
            
//             .result-name {
//                 font-weight: 600;
//                 color: #1d1d1f;
//                 font-size: 15px;
//                 margin-bottom: 2px;
//                 line-height: 1.3;
//                 overflow: hidden;
//                 text-overflow: ellipsis;
//                 white-space: nowrap;
//             }
            
//             .result-description {
//                 font-size: 13px;
//                 color: #86868b;
//                 line-height: 1.3;
//                 overflow: hidden;
//                 text-overflow: ellipsis;
//                 white-space: nowrap;
//             }
            
//             /* Modern Status Badge */
//             .status-badge {
//                 position: absolute;
//                 top: env(safe-area-inset-top, 50px);
//                 right: 16px;
//                 background: rgba(255, 255, 255, 0.95);
//                 backdrop-filter: blur(20px);
//                 -webkit-backdrop-filter: blur(20px);
//                 padding: 8px 12px;
//                 border-radius: 20px;
//                 border: 1px solid rgba(0, 0, 0, 0.06);
//                 font-size: 13px;
//                 font-weight: 500;
//                 color: #30d158;
//                 z-index: 1000;
//                 display: flex;
//                 align-items: center;
//                 gap: 6px;
//                 box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
//                 transition: all 0.3s ease;
//             }
            
//             /* Modern Action Buttons */
//             .floating-buttons {
//                 position: absolute;
//                 bottom: env(safe-area-inset-bottom, 80px);
//                 right: 16px;
//                 display: flex;
//                 flex-direction: column;
//                 gap: 12px;
//                 z-index: 1000;
//             }
            
//             .action-button {
//                 background: rgba(255, 255, 255, 0.95);
//                 backdrop-filter: blur(20px);
//                 -webkit-backdrop-filter: blur(20px);
//                 border: none;
//                 border-radius: 14px;
//                 width: 48px;
//                 height: 48px;
//                 border: 1px solid rgba(0, 0, 0, 0.06);
//                 cursor: pointer;
//                 display: flex;
//                 align-items: center;
//                 justify-content: center;
//                 font-size: 20px;
//                 transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
//                 box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
//             }
            
//             .action-button:hover {
//                 transform: scale(1.05);
//                 box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
//             }
            
//             .action-button:active {
//                 transform: scale(0.95);
//             }
            
//             .clear-button {
//                 color: #ff3b30;
//                 display: none;
//             }
            
//             .location-button {
//                 color: #007aff;
//             }
            
//             /* Enhanced Directions Panel */
//             .directions-panel {
//                 position: absolute;
//                 bottom: 0;
//                 left: 0;
//                 right: 0;
//                 background: rgba(255, 255, 255, 0.98);
//                 backdrop-filter: blur(30px);
//                 -webkit-backdrop-filter: blur(30px);
//                 border-radius: 24px 24px 0 0;
//                 border: 1px solid rgba(0, 0, 0, 0.06);
//                 border-bottom: none;
//                 max-height: 60vh;
//                 z-index: 1001;
//                 display: none;
//                 animation: slideUp 0.4s cubic-bezier(0.4, 0.0, 0.2, 1);
//                 box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.15);
//             }
            
//             @keyframes slideUp {
//                 from { 
//                     transform: translateY(100%); 
//                     opacity: 0;
//                 }
//                 to { 
//                     transform: translateY(0); 
//                     opacity: 1;
//                 }
//             }
            
//             .directions-header {
//                 padding: 20px 20px 16px 20px;
//                 border-bottom: 1px solid rgba(0, 0, 0, 0.06);
//                 display: flex;
//                 justify-content: space-between;
//                 align-items: flex-start;
//             }
            
//             .directions-title {
//                 font-size: 20px;
//                 font-weight: 700;
//                 color: #1d1d1f;
//                 margin: 0 0 8px 0;
//                 line-height: 1.2;
//             }
            
//             .directions-summary {
//                 display: flex;
//                 flex-wrap: wrap;
//                 gap: 16px;
//                 font-size: 14px;
//                 color: #86868b;
//                 font-weight: 500;
//             }
            
//             .close-button {
//                 background: rgba(142, 142, 147, 0.12);
//                 border: none;
//                 border-radius: 12px;
//                 width: 32px;
//                 height: 32px;
//                 cursor: pointer;
//                 display: flex;
//                 align-items: center;
//                 justify-content: center;
//                 color: #86868b;
//                 transition: all 0.2s ease;
//                 font-size: 16px;
//                 flex-shrink: 0;
//             }
            
//             .close-button:hover {
//                 background: rgba(142, 142, 147, 0.2);
//                 color: #1d1d1f;
//             }
            
//             .directions-content {
//                 padding: 0 20px 20px 20px;
//                 max-height: calc(60vh - 120px);
//                 overflow-y: auto;
//                 -webkit-overflow-scrolling: touch;
//             }
            
//             .direction-step {
//                 display: flex;
//                 align-items: flex-start;
//                 gap: 16px;
//                 padding: 16px 0;
//                 border-bottom: 1px solid rgba(0, 0, 0, 0.05);
//             }
            
//             .direction-step:last-child {
//                 border-bottom: none;
//                 padding-bottom: 0;
//             }
            
//             .direction-icon {
//                 font-size: 20px;
//                 width: 24px;
//                 text-align: center;
//                 margin-top: 2px;
//                 flex-shrink: 0;
//             }
            
//             .direction-text {
//                 flex: 1;
//                 min-width: 0;
//             }
            
//             .direction-instruction {
//                 font-size: 16px;
//                 color: #1d1d1f;
//                 line-height: 1.4;
//                 margin-bottom: 4px;
//                 font-weight: 500;
//             }
            
//             .direction-distance {
//                 font-size: 14px;
//                 color: #86868b;
//                 font-weight: 500;
//             }
            
//             /* Scrollbar styling for webkit browsers */
//             .search-results::-webkit-scrollbar,
//             .directions-content::-webkit-scrollbar {
//                 width: 3px;
//             }
            
//             .search-results::-webkit-scrollbar-track,
//             .directions-content::-webkit-scrollbar-track {
//                 background: transparent;
//             }
            
//             .search-results::-webkit-scrollbar-thumb,
//             .directions-content::-webkit-scrollbar-thumb {
//                 background: rgba(0, 0, 0, 0.2);
//                 border-radius: 3px;
//             }
            
//             /* Responsive adjustments */
//             @media (max-width: 480px) {
//                 .search-container {
//                     left: 12px;
//                     right: 12px;
//                 }
                
//                 .status-badge {
//                     right: 12px;
//                 }
                
//                 .floating-buttons {
//                     right: 12px;
//                 }
                
//                 .directions-header {
//                     padding: 16px 16px 12px 16px;
//                 }
                
//                 .directions-content {
//                     padding: 0 16px 16px 16px;
//                 }
                
//                 .directions-title {
//                     font-size: 18px;
//                 }
//             }
//         </style>
//     </head>
//     <body>
//         <!-- Modern Status Badge -->
//         <div class="status-badge" id="statusBadge">
//             <span>📍</span>
//             <span>OAU Campus</span>
//         </div>

//         <!-- Enhanced Search Container -->
//         <div class="search-container">
//             <div class="search-box">
//                 <div class="search-icon"></div>
//                 <input type="text" class="search-input" id="searchInput" placeholder="Search campus locations..." onkeyup="handleSearch()" onfocus="showSearchResults()" />
//             </div>
//             <div class="search-results" id="searchResults"></div>
//         </div>

//         <!-- Modern Floating Action Buttons -->
//         <div class="floating-buttons">
//             <button class="action-button clear-button" id="clearButton" onclick="clearDirections()">
//                 ✕
//             </button>
//             <button class="action-button location-button" onclick="centerOnUserLocation()">
//                 🎯
//             </button>
//         </div>

//         <!-- Enhanced Directions Panel -->
//         <div class="directions-panel" id="directionsPanel">
//             <div class="directions-header">
//                 <div>
//                     <h3 class="directions-title" id="directionsTitle">Directions</h3>
//                     <div class="directions-summary" id="directionsSummary"></div>
//                 </div>
//                 <button class="close-button" onclick="clearDirections()">✕</button>
//             </div>
//             <div class="directions-content" id="directionsSteps"></div>
//         </div>

//         <div id="map"></div>
//         <script>
//             // Comprehensive campus destinations
//             const destinations = {
//                 // Main Buildings
//                 'great-ife': {lat: 7.5165, lng: 4.5275, name: "Great Ife", desc: "Main Auditorium", category: "Facilities", keywords: "auditorium, hall, events, graduation"},
//                 'library': {lat: 7.5185, lng: 4.5275, name: "Kenneth Dike Library", desc: "University Library", category: "Academic", keywords: "library, books, study, research"},
//                 'admin': {lat: 7.5190, lng: 4.5280, name: "Administrative Building", desc: "University Administration", category: "Administration", keywords: "admin, office, registrar, vc office"},
//                 'sub': {lat: 7.5175, lng: 4.5265, name: "Student Union Building", desc: "SUB", category: "Student Services", keywords: "sub, student union, activities"},
                
//                 // Faculties
//                 'science': {lat: 7.5195, lng: 4.5295, name: "Faculty of Science", desc: "Science Complex", category: "Academic", keywords: "science, physics, chemistry, biology, mathematics"},
//                 'arts': {lat: 7.5205, lng: 4.5305, name: "Faculty of Arts", desc: "Arts Complex", category: "Academic", keywords: "arts, literature, languages, philosophy, history"},
//                 'engineering': {lat: 7.5210, lng: 4.5290, name: "Faculty of Engineering", desc: "Engineering Complex", category: "Academic", keywords: "engineering, technology, mechanical, electrical, civil"},
//                 'law': {lat: 7.5170, lng: 4.5260, name: "Faculty of Law", desc: "Law Faculty", category: "Academic", keywords: "law, legal, jurisprudence"},
//                 'education': {lat: 7.5200, lng: 4.5270, name: "Faculty of Education", desc: "Education Faculty", category: "Academic", keywords: "education, teaching, pedagogy"},
//                 'social-sciences': {lat: 7.5180, lng: 4.5290, name: "Faculty of Social Sciences", desc: "Social Sciences", category: "Academic", keywords: "social sciences, psychology, sociology, economics"},
//                 'agriculture': {lat: 7.5220, lng: 4.5320, name: "Faculty of Agriculture", desc: "Agriculture Faculty", category: "Academic", keywords: "agriculture, farming, crop science"},
//                 'medicine': {lat: 7.5160, lng: 4.5270, name: "Faculty of Medicine", desc: "Medical School", category: "Academic", keywords: "medicine, medical, doctor, health"},
//                 'pharmacy': {lat: 7.5165, lng: 4.5285, name: "Faculty of Pharmacy", desc: "Pharmacy School", category: "Academic", keywords: "pharmacy, drugs, pharmaceutical"},
//                 'dentistry': {lat: 7.5170, lng: 4.5290, name: "Faculty of Dentistry", desc: "Dental School", category: "Academic", keywords: "dentistry, dental, teeth"},
                
//                 // Services & Facilities
//                 'health': {lat: 7.5155, lng: 4.5285, name: "University Health Centre", desc: "Medical Services", category: "Health Services", keywords: "health centre, clinic, medical, doctor, hospital"},
//                 'sports': {lat: 7.5140, lng: 4.5300, name: "Sports Complex", desc: "Sports Facilities", category: "Sports", keywords: "sports, gym, football, basketball, athletics"},
//                 'bookshop': {lat: 7.5175, lng: 4.5270, name: "University Bookshop", desc: "Academic Bookstore", category: "Shopping", keywords: "bookshop, books, stationery, supplies"},
//                 'bank': {lat: 7.5180, lng: 4.5275, name: "Campus Bank", desc: "Banking Services", category: "Financial Services", keywords: "bank, atm, money, banking"},
//                 'post-office': {lat: 7.5185, lng: 4.5280, name: "Post Office", desc: "Postal Services", category: "Services", keywords: "post office, mail, courier"},
//                 'cafeteria': {lat: 7.5175, lng: 4.5285, name: "Main Cafeteria", desc: "Dining Hall", category: "Food Services", keywords: "cafeteria, food, dining, restaurant, meals"},
                
//                 // Hostels & Accommodation
//                 'angola-hall': {lat: 7.5120, lng: 4.5250, name: "Angola Hall", desc: "Student Hostel", category: "Accommodation", keywords: "angola hall, hostel, accommodation, residence"},
//                 'mozambique-hall': {lat: 7.5110, lng: 4.5260, name: "Mozambique Hall", desc: "Student Hostel", category: "Accommodation", keywords: "mozambique hall, hostel, accommodation"},
//                 'queens-hall': {lat: 7.5130, lng: 4.5240, name: "Queen Elizabeth II Hall", desc: "Female Hostel", category: "Accommodation", keywords: "queens hall, female hostel, ladies"},
                
//                 // Other Important Locations
//                 'main-gate': {lat: 7.5200, lng: 4.5250, name: "Main Gate", desc: "University Entrance", category: "Landmarks", keywords: "main gate, entrance, security"},
//                 'senate-building': {lat: 7.5185, lng: 4.5285, name: "Senate Building", desc: "University Senate", category: "Administration", keywords: "senate, governance, council"},
//                 'chapel': {lat: 7.5190, lng: 4.5270, name: "University Chapel", desc: "Religious Center", category: "Religious", keywords: "chapel, church, worship, prayer"},
//                 'mosque': {lat: 7.5195, lng: 4.5275, name: "University Mosque", desc: "Islamic Center", category: "Religious", keywords: "mosque, islamic center, prayer"}
//             };
            
//             let map, directionsService, directionsRenderer;
            
//             function initMap() {
//                 // Initialize map centered on OAU with modern styling
//                 map = new google.maps.Map(document.getElementById("map"), {
//                     zoom: 16,
//                     center: { lat: 7.5181, lng: 4.5284 },
//                     mapTypeControl: false,
//                     streetViewControl: false,
//                     fullscreenControl: false,
//                     zoomControl: false,
//                     gestureHandling: 'auto',
//                     styles: [
//                         {
//                             featureType: "all",
//                             elementType: "geometry",
//                             stylers: [{ color: "#f5f5f5" }]
//                         },
//                         {
//                             featureType: "water",
//                             elementType: "geometry",
//                             stylers: [{ color: "#e9e9e9" }]
//                         },
//                         {
//                             featureType: "water",
//                             elementType: "labels.text.fill",
//                             stylers: [{ color: "#9e9e9e" }]
//                         },
//                         {
//                             featureType: "road",
//                             elementType: "geometry",
//                             stylers: [{ color: "#ffffff" }]
//                         },
//                         {
//                             featureType: "road.arterial",
//                             elementType: "labels.text.fill",
//                             stylers: [{ color: "#757575" }]
//                         },
//                         {
//                             featureType: "road.highway",
//                             elementType: "geometry",
//                             stylers: [{ color: "#dadada" }]
//                         },
//                         {
//                             featureType: "road.highway",
//                             elementType: "labels.text.fill",
//                             stylers: [{ color: "#616161" }]
//                         },
//                         {
//                             featureType: "road.local",
//                             elementType: "labels.text.fill",
//                             stylers: [{ color: "#9e9e9e" }]
//                         },
//                         {
//                             featureType: "poi",
//                             elementType: "labels.text.fill",
//                             stylers: [{ color: "#757575" }]
//                         },
//                         {
//                             featureType: "poi.school",
//                             elementType: "labels",
//                             stylers: [{ visibility: "on" }]
//                         },
//                         {
//                             featureType: "transit.line",
//                             elementType: "geometry",
//                             stylers: [{ color: "#e5e5e5" }]
//                         },
//                         {
//                             featureType: "transit.station",
//                             elementType: "geometry",
//                             stylers: [{ color: "#eeeeee" }]
//                         }
//                     ]
//                 });
                
//                 // Initialize directions service and renderer
//                 directionsService = new google.maps.DirectionsService();
//                 directionsRenderer = new google.maps.DirectionsRenderer({
//                     draggable: false,
//                     panel: null // We'll create our own panel
//                 });
//                 directionsRenderer.setMap(map);
                
//                 // Add marker for OAU main campus with modern styling
//                 const oauMarker = new google.maps.Marker({
//                     position: { lat: 7.5181, lng: 4.5284 },
//                     map: map,
//                     title: "Obafemi Awolowo University",
//                     icon: {
//                         url: 'data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36"><circle cx="18" cy="18" r="16" fill="%23007aff" stroke="%23ffffff" stroke-width="3"/><circle cx="18" cy="18" r="8" fill="%23ffffff"/><text x="18" y="23" text-anchor="middle" fill="%23007aff" font-size="14" font-weight="600">🏫</text></svg>',
//                         scaledSize: new google.maps.Size(36, 36),
//                         anchor: new google.maps.Point(18, 18)
//                     }
//                 });
                
//                 const oauInfoWindow = new google.maps.InfoWindow({
//                     content: '<div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 8px; text-align: center; line-height: 1.5;"><strong style="color: #1d1d1f; font-size: 16px; font-weight: 600;">Obafemi Awolowo University</strong><br><span style="color: #86868b; font-size: 14px;">Main Campus</span><br><small style="color: #86868b; font-size: 12px;">Ile-Ife, Osun State</small></div>'
//                 });
                
//                 oauMarker.addListener("click", () => {
//                     oauInfoWindow.open(map, oauMarker);
//                 });
                
//                 // Add campus landmarks with navigation
//                 Object.entries(destinations).forEach(([key, destination]) => {
//                     const marker = new google.maps.Marker({
//                         position: { lat: destination.lat, lng: destination.lng },
//                         map: map,
//                         title: destination.name,
//                         icon: {
//                             url: 'data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><circle cx="14" cy="14" r="12" fill="%23ff9500" stroke="%23ffffff" stroke-width="2"/><circle cx="14" cy="14" r="6" fill="%23ffffff"/></svg>',
//                             scaledSize: new google.maps.Size(28, 28),
//                             anchor: new google.maps.Point(14, 14)
//                         }
//                     });
                    
//                     const infoWindow = new google.maps.InfoWindow({
//                         content: '<div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 12px; text-align: center; line-height: 1.5; min-width: 200px;"><strong style="color: #1d1d1f; font-size: 16px; font-weight: 600;">' + destination.name + '</strong><br>' +
//                                 '<span style="color: #86868b; font-size: 14px;">' + destination.desc + '</span><br>' +
//                                 '<span style="color: #86868b; font-size: 12px; font-weight: 500;">' + destination.category + '</span><br>' +
//                                 '<button onclick="navigateTo(\\'' + key + '\\')" style="margin-top: 12px; background: #007aff; color: white; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-weight: 500; font-size: 14px; font-family: inherit;">🧭 Navigate Here</button>' +
//                                 '</div>'
//                     });
                    
//                     marker.addListener("click", () => {
//                         // Clear any existing directions first
//                         clearDirections();
//                         infoWindow.open(map, marker);
//                     });
//                 });
                
//                 // Try to get user location
//                 if (navigator.geolocation) {
//                     navigator.geolocation.getCurrentPosition(
//                         (position) => {
//                             const userLocation = {
//                                 lat: position.coords.latitude,
//                                 lng: position.coords.longitude
//                             };
                            
//                             const userMarker = new google.maps.Marker({
//                                 position: userLocation,
//                                 map: map,
//                                 title: "Your Location",
//                                 icon: {
//                                     url: 'data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="%23007aff" stroke="%23ffffff" stroke-width="3"/><circle cx="12" cy="12" r="4" fill="%23ffffff"/></svg>',
//                                     scaledSize: new google.maps.Size(24, 24),
//                                     anchor: new google.maps.Point(12, 12)
//                                 }
//                             });
                            
//                             // Store user location globally for the location button
//                             window.userLocation = userLocation;
//                         },
//                         (error) => {
//                             console.log("Location access denied or failed:", error);
//                         }
//                     );
//                 }
//             }
            
//             // Navigation functions
//             function navigateTo(destinationKey) {
//                 const destination = destinations[destinationKey];
//                 if (!destination) return;
                
//                 if (navigator.geolocation) {
//                     navigator.geolocation.getCurrentPosition(
//                         (position) => {
//                             const origin = {
//                                 lat: position.coords.latitude,
//                                 lng: position.coords.longitude
//                             };
//                             const destinationPos = {
//                                 lat: destination.lat,
//                                 lng: destination.lng
//                             };
                            
//                             calculateAndDisplayRoute(origin, destinationPos, destination.name);
//                         },
//                         (error) => {
//                             // Fallback: navigate from campus center
//                             const campusCenter = { lat: 7.5181, lng: 4.5284 };
//                             const destinationPos = {
//                                 lat: destination.lat,
//                                 lng: destination.lng
//                             };
                            
//                             alert('Could not get your location. Showing route from campus center.');
//                             calculateAndDisplayRoute(campusCenter, destinationPos, destination.name);
//                         }
//                     );
//                 } else {
//                     alert('Geolocation is not supported by this device.');
//                 }
//             }
            
//             function calculateAndDisplayRoute(origin, destination, destinationName) {
//                 directionsService.route(
//                     {
//                         origin: origin,
//                         destination: destination,
//                         travelMode: google.maps.TravelMode.WALKING,
//                         avoidHighways: true,
//                         avoidTolls: true,
//                         unitSystem: google.maps.UnitSystem.METRIC
//                     },
//                     (response, status) => {
//                         if (status === "OK") {
//                             directionsRenderer.setDirections(response);
//                             showTurnByTurnDirections(response, destinationName);
//                         } else {
//                             alert('Directions request failed: ' + status + '. Please try again or check your location permissions.');
//                         }
//                     }
//                 );
//             }
            
//             function showTurnByTurnDirections(response, destinationName) {
//                 const route = response.routes[0];
//                 const leg = route.legs[0];
//                 const steps = leg.steps;
                
//                 // Update header
//                 document.getElementById('directionsTitle').textContent = destinationName;
//                 document.getElementById('directionsSummary').innerHTML = 
//                     '<span>📏 ' + leg.distance.text + '</span>' +
//                     '<span>⏱️ ' + leg.duration.text + '</span>' +
//                     '<span>🚶‍♂️ Walking</span>';
                
//                 // Build steps HTML
//                 let stepsHTML = '';
//                 steps.forEach((step, index) => {
//                     const instruction = step.instructions.replace(/<[^>]*>/g, ''); // Remove HTML tags
//                     const icon = getDirectionIcon(instruction, index === 0, index === steps.length - 1);
                    
//                     stepsHTML += '<div class="direction-step">' +
//                         '<div class="direction-icon">' + icon + '</div>' +
//                         '<div class="direction-text">' +
//                             '<div class="direction-instruction">' + instruction + '</div>' +
//                             '<div class="direction-distance">' + step.distance.text + '</div>' +
//                         '</div>' +
//                     '</div>';
//                 });
                
//                 document.getElementById('directionsSteps').innerHTML = stepsHTML;
//                 document.getElementById('directionsPanel').style.display = 'block';
//                 document.getElementById('clearButton').style.display = 'flex';
                
//                 // Update status badge
//                 updateStatusBadge('🧭', 'Navigating');
//             }
            
//             function getDirectionIcon(instruction, isFirst, isLast) {
//                 if (isFirst) return '🚶‍♂️';
//                 if (isLast) return '🏁';
                
//                 const text = instruction.toLowerCase();
                
//                 if (text.includes('turn right') || text.includes('right turn')) return '➡️';
//                 if (text.includes('turn left') || text.includes('left turn')) return '⬅️';
//                 if (text.includes('slight right')) return '↗️';
//                 if (text.includes('slight left')) return '↖️';
//                 if (text.includes('sharp right')) return '↩️';
//                 if (text.includes('sharp left')) return '↪️';
//                 if (text.includes('continue') || text.includes('straight')) return '⬆️';
//                 if (text.includes('roundabout')) return '🔄';
//                 if (text.includes('u-turn')) return '↶';
//                 if (text.includes('merge')) return '🔀';
//                 if (text.includes('head')) return '🧭';
                
//                 return '📍';
//             }
            
//             function clearDirections() {
//                 directionsRenderer.setDirections({routes: []});
//                 document.getElementById('directionsPanel').style.display = 'none';
//                 document.getElementById('clearButton').style.display = 'none';
//                 document.getElementById('searchResults').style.display = 'none';
//                 document.getElementById('searchInput').value = '';
//                 updateStatusBadge('📍', 'OAU Campus');
//             }
            
//             function updateStatusBadge(icon, text) {
//                 const badge = document.getElementById('statusBadge');
//                 badge.innerHTML = '<span>' + icon + '</span><span>' + text + '</span>';
//             }
            
//             function showSearchResults() {
//                 const query = document.getElementById('searchInput').value;
//                 if (query.length > 0) {
//                     handleSearch();
//                 }
//             }
            
//             // Search functionality
//             function handleSearch() {
//                 const query = document.getElementById('searchInput').value.toLowerCase().trim();
//                 const resultsDiv = document.getElementById('searchResults');
                
//                 if (query.length < 2) {
//                     resultsDiv.style.display = 'none';
//                     return;
//                 }
                
//                 const matches = Object.entries(destinations).filter(([key, location]) => {
//                     return location.name.toLowerCase().includes(query) || 
//                            location.desc.toLowerCase().includes(query) ||
//                            location.category.toLowerCase().includes(query) ||
//                            location.keywords.toLowerCase().includes(query);
//                 }).slice(0, 8); // Limit to 8 results
                
//                 if (matches.length === 0) {
//                     resultsDiv.innerHTML = '<div style="padding: 10px; color: #666; text-align: center;">No locations found</div>';
//                     resultsDiv.style.display = 'block';
//                     return;
//                 }
                
//                 resultsDiv.innerHTML = matches.map(([key, location]) => 
//                     '<div class="search-result-item" onclick="selectLocation(\\'' + key + '\\', \\'' + location.name + '\\')">' +
//                         '<div class="result-icon">' + getCategoryIcon(location.category) + '</div>' +
//                         '<div class="result-content">' +
//                             '<div class="result-name">' + location.name + '</div>' +
//                             '<div class="result-description">' + location.desc + ' • ' + location.category + '</div>' +
//                         '</div>' +
//                     '</div>'
//                 ).join('');
                
//                 resultsDiv.style.display = 'block';
//             }
            
//             function getCategoryIcon(category) {
//                 const icons = {
//                     'Academic': '🏫',
//                     'Administration': '🏛️',
//                     'Student Services': '👥',
//                     'Health Services': '🏥',
//                     'Sports': '⚽',
//                     'Shopping': '🛒',
//                     'Financial Services': '🏦',
//                     'Services': '📫',
//                     'Food Services': '🍽️',
//                     'Accommodation': '🏠',
//                     'Landmarks': '📍',
//                     'Religious': '⛪',
//                     'Facilities': '🏢'
//                 };
//                 return icons[category] || '📍';
//             }
            
//             function selectLocation(locationKey, locationName) {
//                 document.getElementById('searchInput').value = locationName;
//                 document.getElementById('searchResults').style.display = 'none';
//                 updateStatusBadge('🔍', 'Finding route...');
//                 navigateTo(locationKey);
//             }
            
//             function centerOnUserLocation() {
//                 if (navigator.geolocation) {
//                     navigator.geolocation.getCurrentPosition(
//                         (position) => {
//                             const userLocation = {
//                                 lat: position.coords.latitude,
//                                 lng: position.coords.longitude
//                             };
                            
//                             map.setCenter(userLocation);
//                             map.setZoom(18);
//                             updateStatusBadge('🎯', 'Your Location');
                            
//                             // Update the global user location
//                             window.userLocation = userLocation;
//                         },
//                         (error) => {
//                             alert('Could not access your location. Please enable location services.');
//                             console.log("Location access denied:", error);
//                         },
//                         {
//                             enableHighAccuracy: true,
//                             timeout: 10000,
//                             maximumAge: 60000
//                         }
//                     );
//                 } else {
//                     alert('Geolocation is not supported by this device.');
//                 }
//             }
//         </script>
        
//         <!-- Google Maps JavaScript API -->
//         <script async defer
//             src="https://maps.googleapis.com/maps/api/js?key=AIzaSyBYI2ZiWhDcWPV1Bk1-flCIhBKrbVZbQ7w&callback=initMap&libraries=geometry">
//         </script>
//     </body>
//     </html>
//   `;

//   return (
//     <View style={styles.container}>
//       <WebView
//         source={{ html: mapHTML }}
//         style={styles.webview}
//         javaScriptEnabled={true}
//         domStorageEnabled={true}
//         geolocationEnabled={true}
//         allowsInlineMediaPlayback={true}
//         mediaPlaybackRequiresUserAction={false}
//         originWhitelist={['*']}
//         mixedContentMode="compatibility"
//         onError={(syntheticEvent) => {
//           const { nativeEvent } = syntheticEvent;
//           console.warn('WebView error: ', nativeEvent);
//         }}
//         onHttpError={(syntheticEvent) => {
//           const { nativeEvent } = syntheticEvent;
//           console.warn('WebView HTTP error: ', nativeEvent);
//         }}
//       />
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//   },
//   webview: {
//     flex: 1,
//     width: Dimensions.get('window').width,
//     height: Dimensions.get('window').height,
//   },
// });

// export default SimpleMap;
// */

// // Placeholder component to prevent import errors
// import React from 'react';
// import { View, Text } from 'react-native';

// const SimpleMap = () => (
//   <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
//     <Text>Please use NativeMap component instead</Text>
//   </View>
// );

// export default SimpleMap;

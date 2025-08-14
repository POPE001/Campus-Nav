# 📅 Enhanced Scheduling System - Campus Nav

## 🚀 Features Overview

The Campus Nav scheduling system provides comprehensive timetable management with advanced features for students and staff at Obafemi Awolowo University.

### ✨ **Key Features Implemented**

#### 1. **📚 Personal Timetable Creation & Editing**
- **Modern Weekly View**: Clean grid layout showing Monday-Friday with hourly time slots (8:00-17:00)
- **Multiple Event Types**: 
  - 📚 Classes - Regular lectures and labs
  - 📝 Exams - Tests and examinations
  - ⏰ Deadlines - Assignment and project submissions
- **Smart Form Validation**: Prevents scheduling conflicts and ensures all required fields are filled
- **Visual Course Cards**: Color-coded cards with emoji indicators and duration display
- **User Type Customization**: Different interfaces for students vs. staff members

#### 2. **🗺️ Automatic Venue-Map Sync**
- **Comprehensive Venue Database**: 20+ OAU locations with precise GPS coordinates
- **Smart Venue Search**: Real-time search with suggestions as you type
- **Map Integration**: One-tap navigation to venues from course cards
- **Venue Details**: Capacity, amenities, building information
- **Location Categories**:
  - Lecture Halls (LT1, LT2, Engineering LT, etc.)rrr
  - Laboratories (Physics, Chemistry, Computer Labs)
  - Libraries (Hezekiah Oluwasanmi Library)
  - Administrative Buildings (Registry, VC Office)
  - Recreation (Sports Complex, Cafeterias)

#### 3. **🔔 Smart Reminder System**
- **Multi-Level Notifications**: Different reminder strategies for each event type
- **Class Reminders**: Single notification before class starts (5-120 minutes)
- **Exam Alerts**: Progressive reminders (1 week → 3 days → 1 day → 2 hours → custom)
- **Deadline Warnings**: Escalating notifications (3 days → 1 day → 6 hours → 1 hour → custom)
- **Customizable Timing**: Choose reminder intervals from 5 minutes to 2 hours
- **Smart Scheduling**: Automatic calculation of notification times based on course schedules

#### 4. **💫 Advanced User Experience**
- **Responsive Design**: Optimized for both iOS and Android
- **Beautiful UI**: Modern gradient headers, card-based design, smooth animations
- **Intuitive Navigation**: Easy-to-use forms with visual feedback
- **Smart Defaults**: Pre-filled forms with sensible default values
- **Error Handling**: Graceful error handling with helpful user messages

---

## 🛠️ **Technical Implementation**

### **Architecture**
```
components/
├── Timetable.tsx          # Main timetable component
├── CourseModal.tsx        # Enhanced course creation/editing modal
└── CustomTabBar.tsx       # Navigation with user-based visibility

constants/
└── Venues.ts              # OAU venue database with coordinates

services/
└── NotificationService.ts # Push notification management
```

### **Dependencies Added**
- `@react-native-community/datetimepicker` - Date/time selection
- `expo-notifications` - Push notification system
- `@react-native-picker/picker` - Enhanced picker components

### **Data Structure**
```typescript
interface Course {
  id: string;
  title: string;
  code: string;
  instructor: string;
  location: string;
  venueId?: string;                    // Links to venue database
  day: string;
  startTime: string;
  endTime: string;
  color: string;
  type: 'class' | 'exam' | 'deadline'; // Event categorization
  description?: string;
  reminderEnabled: boolean;
  reminderMinutes: number;
  examDate?: string;                   // For exam events
  deadlineDate?: string;              // For deadline events
}
```

---

## 🎯 **Usage Guide**

### **For Students**
1. **Add Classes**: Tap + button → Select "📚 Class" → Fill details → Choose venue → Set reminders
2. **Schedule Exams**: Select "📝 Exam" → Set exam date → Configure multiple reminders
3. **Track Deadlines**: Select "⏰ Deadline" → Set due date → Get progressive alerts
4. **Navigate Campus**: Tap course cards → "View on Map" → Get directions to venues

### **For Staff**
1. **Create Teaching Schedule**: Same interface with "Class/Group" field instead of "Instructor"
2. **Set Office Hours**: Use deadline type for consultation periods
3. **Schedule Meetings**: Use class type for staff meetings in specific venues

### **Venue Integration**
1. **Smart Search**: Type venue name or code (e.g., "LT1", "Physics Lab")
2. **Auto-Complete**: Select from filtered suggestions
3. **Map Navigation**: Tap venue links in course cards for GPS navigation
4. **Venue Details**: See capacity, amenities, and building information

### **Notification Setup**
1. **Permission Request**: App automatically requests notification permissions
2. **Smart Defaults**: 15-minute reminders for classes, longer for exams/deadlines
3. **Customization**: Adjust reminder timing in course details
4. **Multiple Alerts**: Exams get progressive reminders over time

---

## 🚀 **Future Enhancements**

### **Planned Features**
- [ ] **Calendar Import/Export**: Sync with Google Calendar, Outlook
- [ ] **Attendance Tracking**: Check-in system with location verification
- [ ] **Study Groups**: Create and join study sessions for courses
- [ ] **Room Booking**: Reserve available venues for group study
- [ ] **Weather Integration**: Get weather updates for outdoor venues
- [ ] **Transportation**: Bus schedule integration for campus routes
- [ ] **Professor Ratings**: Student feedback system for instructors
- [ ] **Course Materials**: Link to lecture notes and assignments

### **Technical Improvements**
- [ ] **Offline Support**: Cache schedules for offline viewing
- [ ] **Data Persistence**: Cloud sync with Supabase database
- [ ] **Performance**: Lazy loading for large schedules
- [ ] **Accessibility**: Screen reader support and keyboard navigation
- [ ] **Analytics**: Usage tracking and schedule optimization suggestions

---

## 🔧 **Setup Instructions**

### **Dependencies Installation**
```bash
npm install @react-native-community/datetimepicker expo-notifications @react-native-picker/picker
```

### **Notification Permissions**
The app automatically requests notification permissions when scheduling reminders. Users can:
- Grant permissions for full reminder functionality
- Deny permissions and still use the app without notifications
- Manage notification settings in device settings

### **Venue Database**
The venue database in `constants/Venues.ts` contains real OAU locations with GPS coordinates. You can:
- Add new venues as the university expands
- Update coordinates for better accuracy
- Add amenity information for enhanced user experience

---

## 📱 **Screenshots & Demo**

The enhanced scheduling system provides:
- **Weekly Timetable View**: Clean, professional interface
- **Course Creation Modal**: Comprehensive form with all options
- **Venue Selection**: Smart search with real OAU locations
- **Notification Management**: Granular reminder controls
- **Map Integration**: Seamless navigation to campus venues

---

## 🎉 **Conclusion**

The Campus Nav scheduling system represents a complete solution for academic time management at OAU. With its combination of intuitive design, smart venue integration, and comprehensive reminder system, it transforms how students and staff manage their campus schedules.

**Key Benefits:**
- ✅ **Time Savings**: Quick course creation with smart defaults
- ✅ **Never Miss Events**: Progressive reminder system
- ✅ **Easy Navigation**: One-tap venue directions
- ✅ **Organized Life**: Visual schedule management
- ✅ **Campus Integration**: Real OAU venue database
- ✅ **User-Friendly**: Intuitive interface for all users


            src="https://maps.googleapis.com/maps/api/js?key=AIzaSyBYI2ZiWhDcWPV1Bk1-flCIhBKrbVZbQ7w&callback=initMap&libraries=geometry">

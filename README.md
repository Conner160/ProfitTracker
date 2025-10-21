# ProfitTracker

**Enterprise-Grade Progressive Web App for Clear Connections Contracting Ltd.**

A secure, professional PWA for tracking piece-rate earnings, mileage, and per diem payments with real-time cloud sync and comprehensive security features.

## 🏢 Built for Clear Connections Field Operations

**Version 2.5.2** - Professional profit tracking system with enterprise-grade security, Google Firebase authentication, and company-specific access controls.

## 🛡️ Security Features

### Authentication & Access Control
- **Company-Only Access**: Domain-restricted to Clear Connections employees only
- **Email Verification**: Required verification for all cloud operations
- **Multi-Domain Support**: @clearconnectionsc.ca, @clearconn.ca, @clearconnectionsltd.ca
- **Username Signin**: Flexible authentication (username or full email)
- **Google Firebase**: Enterprise-grade authentication backbone

### Data Protection
- **Online-First Architecture**: Real-time cloud sync with offline backup
- **Encrypted Storage**: Google Cloud Firestore with bank-level encryption
- **Service Worker Security**: Granular file protection and access controls
- **Content Security Policy**: Strict CSP headers preventing unauthorized access
- **HTTPS Enforcement**: Automatic secure connection redirect

### Professional Features
- **Clear Connections Branding**: Professional email communications
- **Email Aliases**: Sign up with one domain, sign in with any company alias
- **Trust Indicators**: Google Firebase security badges on login
- **Audit Trail**: Complete changelog system for compliance

## 💼 Core Features

### Earnings Tracking
- **Points System**: Track daily points with customizable rates ($7.00/point default)
- **Mileage Tracking**: Record kilometers with mileage rates ($0.84/km default)
- **Per Diem Management**: Track per diem payments ($171 default)
- **Pay Period Logic**: Bi-weekly tracking starting July 5, 2025
- **GST Calculation**: Automatic 5% GST computation
- **Real-time Sync**: Instant cloud backup and cross-device synchronization

### Travel & Location Management
- **Land Location Tracking**: Multiple locations per day support
- **Travel Sheet Generation**: Professional Excel export with tech codes
- **Location Mapping**: Comprehensive location-to-entry association
- **Template Support**: Custom Excel template integration

### Data Management
- **Cloud-First Storage**: Primary Firebase Firestore with IndexedDB backup
- **Offline Capability**: Full functionality when internet unavailable
- **Entry Management**: Edit, delete, and validate entries with confirmation
- **Duplicate Prevention**: Smart date validation and conflict resolution

## 📊 Travel Sheet Generation

Professional Excel export system designed for Clear Connections operations:

### Export Features
- **Format**: Excel-compatible `.xlsx` files
- **Tech Code Integration**: Set company tech codes (format: C###, e.g., O897)
- **Smart Naming**: `[TechCode]_Travel_[StartDate]-[EndDate].xlsx`
- **Date Formatting**: Professional DD-MMM-YYYY format
- **Location Mapping**:
  - Column A: Entry dates (A29:A50)
  - Column B: Primary locations (B29:B50)  
  - Column C: Additional locations, comma-separated (C29:C50)
- **Dynamic Rows**: Auto-insertion for entries exceeding 22 records
- **Template Support**: Custom `CCC_Travel_Sheet.xlsx` template integration
- **Data Validation**: Only exports entries with valid location data

### Template Customization
1. Create Excel template with Clear Connections formatting
2. Save as `CCC_Travel_Sheet.xlsx` in project root
3. Ensure rows 29+ available for data entry
4. System preserves all formatting, formulas, and company branding

## 🚀 Installation & Deployment

### For Clear Connections Employees
1. **Access**: Navigate to the deployed ProfitTracker URL
2. **Sign Up**: Use your Clear Connections company email
3. **Verify**: Check email for verification link from Clear Connections Management
4. **Sign In**: Use username or full company email to access

### For Administrators & Developers
1. **Clone Repository**: `git clone [repository-url]`
2. **Firebase Setup**: Configure Firebase project with Clear Connections domains
3. **Environment Config**: Update `config/env.js` with Firebase credentials
4. **Deploy**: Push to GitHub Pages or preferred hosting platform
5. **Domain Configuration**: Ensure HTTPS and proper CSP headers

### Security Configuration
- **Firebase Authentication**: Configure domain restrictions in Firebase Console
- **Service Worker**: Toggle `IS_DEVELOPMENT = false` for production
- **CSP Headers**: Ensure server-level Content Security Policy implementation
- **Email Templates**: Configure Firebase email templates with Clear Connections branding

## 🔧 Technology Stack

### Frontend Architecture
- **HTML5**: Semantic markup with accessibility features
- **CSS3**: Responsive design with mobile-first approach
- **JavaScript ES6+**: Modern JavaScript with module system
- **PWA Features**: Service workers, manifest, offline capability

### Security & Authentication
- **Google Firebase**: Authentication, Firestore database, email verification
- **Content Security Policy**: Strict CSP with allowlisted domains
- **Service Worker Security**: File-level access controls and validation
- **Environment Detection**: Dev/prod aware logging and configuration

### Data Storage
- **Firebase Firestore**: Primary cloud database with real-time sync
- **IndexedDB**: Local backup storage and offline queue management
- **Conflict Resolution**: Last-write-wins with timestamp validation

## 📋 Change Management

### Version Control
- **Semantic Versioning**: MAJOR.MINOR.PATCH following industry standards
- **Service Worker Versioning**: Automatic cache invalidation system
- **Complete Changelog**: Documented in `CHANGELOG.md` with business impact
- **AI Development Guidelines**: Comprehensive instructions in `.github/copilot-instructions.md`

### Development Standards
- **Security-First**: "Lock this shit down!" development philosophy
- **Clear Connections Context**: All features designed for company operations
- **Professional Communication**: Enterprise-grade user experience
- **Audit Compliance**: Complete change documentation for company records

## 🎯 Future Development

### Planned Enhancements
- **Advanced Reporting**: Detailed profit analysis and visualizations
- **Mobile Optimization**: Enhanced mobile worker experience
- **Integration Capabilities**: Potential ERP/accounting system integration
- **Performance Analytics**: Detailed tracking of worker productivity metrics

### Clear Connections Roadmap
- **Multi-Project Support**: Track earnings across different job sites
- **Team Management**: Supervisor dashboards and team analytics
- **Company Reporting**: Executive-level profit and productivity reports
- **Compliance Features**: Enhanced audit trails and regulatory compliance

---

**Built with enterprise-grade security for Clear Connections Contracting Ltd.**  
*Professional profit tracking system - Version 2.5.2*

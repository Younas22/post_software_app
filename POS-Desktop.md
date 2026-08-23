

\# UNIVERSAL POS SAAS  
\# WINDOWS \+ macOS DESKTOP POS  
\# MASTER DEVELOPMENT CONTEXT

You are developing the Windows and macOS Desktop POS application for an existing Universal POS SaaS platform.

This desktop application is NOT a separate product.

It is the desktop version of the same Universal POS application.

\==================================================  
CORE PRODUCT RULE  
\==================================================

There is ONE Universal POS SaaS product.

The same business account can use:

1\. Web Browser POS  
2\. Mobile Browser/PWA  
3\. Windows Desktop POS  
4\. macOS Desktop POS

All versions must provide the same core business functionality.

The desktop application may optimize the UX for desktop hardware, keyboard, barcode scanners, printers and offline operation.

Do not create a separate "Client Dashboard" application.

\==================================================  
BACKEND  
\==================================================

Existing backend:

Laravel  
PHP  
MySQL  
REST API

Database:

post\_software

Laravel is the central SaaS authority.

Laravel controls:

Authentication  
Clients  
Businesses  
Branches  
Users  
Roles  
Permissions  
Packages  
Features  
Subscriptions  
Devices  
Business Types  
Settings  
Activity Logs  
Notifications

Do NOT recreate SaaS business logic inside Electron.

\==================================================  
DESKTOP STACK  
\==================================================

Electron  
React  
TypeScript  
SQLite

Recommended architecture:

Electron  
├── Main Process  
├── Preload  
└── Renderer

Renderer:

React UI

Main process:

Electron lifecycle  
Window management  
Native hardware integrations  
SQLite access  
Printing  
Auto updates  
Device functionality

Preload:

Secure IPC bridge

\==================================================  
SECURITY  
\==================================================

IMPORTANT:

Do NOT expose Node.js directly to the renderer.

Use:

contextIsolation: true  
nodeIntegration: false

Use preload APIs for approved native operations.

Do not expose arbitrary IPC.

Do not expose database credentials.

\==================================================  
DATABASE  
\==================================================

Desktop uses SQLite for local/offline functionality.

SQLite is NOT the SaaS master database.

Laravel/MySQL remains the central server database.

Architecture:

Laravel/MySQL  
      ↑  
      │ Sync  
      ↓  
SQLite Local Database

\==================================================  
ONLINE/OFFLINE MODEL  
\==================================================

When online:

Desktop communicates with Laravel API.

When offline:

The desktop POS must continue allowing supported POS operations using SQLite.

Offline operations are stored locally and placed into a sync queue.

When connection returns:

Local changes synchronize with Laravel.

\==================================================  
SYNC PRINCIPLE  
\==================================================

Never blindly overwrite data.

Every synchronized record should have appropriate identifiers.

Use:

server\_id  
local\_id  
sync\_status  
updated\_at  
deleted\_at where required

For transactional data use immutable transaction concepts where possible.

\==================================================  
SYNC STATES  
\==================================================

Example:

pending  
syncing  
synced  
failed  
conflict

Provide retry functionality.

\==================================================  
CONFLICT HANDLING  
\==================================================

Do not silently overwrite conflicts.

For important conflicts:

Detect  
Log  
Mark conflict  
Provide recovery strategy

Sales transactions should be treated as transactional records.

\==================================================  
OFFLINE POS  
\==================================================

The following should work offline when required local data is available:

Product search  
Barcode scanning  
Cart  
Customer selection  
Sales  
Cash payment  
Receipt generation  
Basic sales history

Do NOT claim that every cloud feature works offline.

Management features may require online connectivity.

\==================================================  
LOCAL DATA  
\==================================================

Cache only required business data.

Examples:

Business  
Branch  
User  
Products  
Categories  
Customers  
Tax settings  
Payment methods  
Relevant inventory  
Recent sales

Do not download the entire SaaS database unnecessarily.

\==================================================  
DEVICE REGISTRATION  
\==================================================

Each Electron installation represents a registered device.

The backend already supports Devices.

Desktop must:

Register device  
Receive device identifier  
Associate device with business  
Validate subscription  
Validate device limit

If device is unauthorized:

Do not allow POS access.

\==================================================  
SUBSCRIPTION  
\==================================================

Laravel remains authoritative.

Desktop must periodically validate:

Subscription  
Business status  
Device status  
Feature access

Do not allow frontend-only subscription bypass.

\==================================================  
DESIGN  
\==================================================

The desktop UI MUST match the Web POS.

Same:

Logo  
Typography  
Colors  
Components  
Buttons  
Forms  
Tables  
Cards  
Icons  
Terminology  
Spacing  
Dark mode  
Light mode

Brand colors:

Black  
White  
Neutral Gray

No blue/green/purple primary branding.

\==================================================  
THEME  
\==================================================

Support:

Light Mode  
Dark Mode

Theme should match the Web application.

\==================================================  
FONT  
\==================================================

Inter.

\==================================================  
DESKTOP UX  
\==================================================

Desktop should take advantage of:

Keyboard  
Mouse  
Barcode scanner  
Thermal printer  
Cash drawer  
Multiple monitors if appropriate

Do not make desktop UI unnecessarily large.

\==================================================  
NAVIGATION  
\==================================================

Same core navigation:

Dashboard  
POS  
Products  
Inventory  
Customers  
Suppliers  
Purchases  
Expenses  
Reports  
Employees  
Branches  
Settings  
Subscription

Role/feature based visibility applies.

\==================================================  
POS  
\==================================================

POS must be optimized for:

Speed  
Keyboard  
Barcode scanner  
Touchscreen if available  
Offline operation  
Fast checkout

\==================================================  
PRINTER  
\==================================================

Support receipt printing.

Prepare for:

58mm  
80mm  
A4

Use Electron print APIs appropriately.

\==================================================  
CASH DRAWER  
\==================================================

Prepare hardware abstraction for supported cash drawer mechanisms.

Do not hard-code a single hardware vendor.

\==================================================  
BARCODE  
\==================================================

Support keyboard-emulation barcode scanners first.

A scanner that types into a focused input should work without requiring vendor-specific drivers.

\==================================================  
LOGGING  
\==================================================

Maintain structured local logs for:

Sync errors  
Printer errors  
Device errors  
API errors  
Database errors

Never expose sensitive credentials in logs.

\==================================================  
UPDATES  
\==================================================

Prepare auto-update architecture.

Updates must not destroy:

SQLite data  
local settings  
pending sync queue

\==================================================  
WINDOWS  
\==================================================

Build:

Windows installer

Support appropriate architecture.

\==================================================  
macOS  
\==================================================

Build:

macOS application

Prepare for:

Intel  
Apple Silicon

if project requirements support both.

\==================================================  
PERFORMANCE  
\==================================================

Desktop POS must feel instant.

Avoid unnecessary API calls.

Use local SQLite for fast product/search operations.

\==================================================  
IMPORTANT DEVELOPMENT RULE  
\==================================================

Before coding:

1\. Inspect existing Web POS.  
2\. Inspect existing Laravel API.  
3\. Inspect existing database/API contracts.  
4\. Reuse UI patterns.  
5\. Reuse terminology.  
6\. Reuse business rules.  
7\. Do not invent duplicate systems.  
8\. Do not modify Laravel SaaS architecture unnecessarily.

\==================================================  
NO FAKE DATA  
\==================================================

Do not use fake production data.

\==================================================  
COMPLETION REPORT  
\==================================================

After each phase report:

Files created  
Files modified  
Packages installed  
Electron configuration  
SQLite changes  
IPC changes  
API changes  
Sync changes  
Hardware integration  
Routes/screens  
Tests  
Known limitations  
Next phase

Do not automatically start the next phase.

\==================================================  
MASTER RULE  
\==================================================

This desktop application must always remain the desktop version of the same Universal POS SaaS.

Do not allow architecture, UI, terminology, business logic or feature behavior to drift from the Web POS.

\# DESKTOP PHASE 01  
\# ELECTRON \+ REACT FOUNDATION

Follow DESKTOP\_POS\_MASTER\_CONTEXT.md exactly.

\==================================================  
TASK  
\==================================================

Create a production-ready Electron \+ React \+ TypeScript desktop application.

Use a clean separation:

Electron Main  
Preload  
React Renderer

\==================================================  
SECURITY  
\==================================================

Configure:

contextIsolation: true  
nodeIntegration: false

Do not expose Node.js APIs directly to React.

Use secure preload IPC.

\==================================================  
WINDOW  
\==================================================

Create main application window.

Support:

Minimize  
Maximize  
Restore  
Close

Use appropriate desktop sizing.

Remember window size and position safely.

\==================================================  
ENVIRONMENT  
\==================================================

Support:

Development  
Production

Environment configuration must not expose secrets.

\==================================================  
BUILD  
\==================================================

Prepare scripts for:

Development  
Build  
Windows  
macOS

\==================================================  
DELIVERABLE  
\==================================================

Working Electron shell with React renderer.

No POS functionality yet.

\# DESKTOP PHASE 02  
\# MATCH WEB POS UI/UX

Follow DESKTOP\_POS\_MASTER\_CONTEXT.md.

The desktop application must visually match the existing Web POS.

\==================================================  
REUSE  
\==================================================

Use the same:

Typography  
Colors  
Spacing  
Buttons  
Inputs  
Tables  
Cards  
Badges  
Dialogs  
Navigation  
Icons

\==================================================  
THEME  
\==================================================

Implement:

Light  
Dark

Theme must match Web POS.

\==================================================  
LAYOUT  
\==================================================

Desktop layout:

Sidebar  
Topbar  
Main Content

Sidebar should support collapse.

\==================================================  
RESPONSIVE  
\==================================================

Desktop application must also support:

1366x768  
1440x900  
1920x1080

Do not design only for one resolution.

\==================================================  
DELIVERABLE  
\==================================================

Complete desktop shell matching Web POS.

No hardware integration yet.

\# DESKTOP PHASE 03  
\# AUTHENTICATION \+ DEVICE REGISTRATION

Follow DESKTOP\_POS\_MASTER\_CONTEXT.md.

\==================================================  
LOGIN  
\==================================================

Connect Electron app to Laravel authentication.

Build:

Login  
Logout  
Session restoration

\==================================================  
DEVICE  
\==================================================

After login:

Register this Electron installation as a device.

Send required device information.

Receive:

device\_id  
business  
branch  
subscription  
permissions  
features

\==================================================  
VALIDATION  
\==================================================

On application startup validate:

User  
Business  
Subscription  
Device  
Permissions

\==================================================  
UNAUTHORIZED  
\==================================================

If device is:

Suspended  
Removed  
Unauthorized  
Subscription expired

show clear message and restrict access appropriately.

\==================================================  
SECURITY  
\==================================================

Never store sensitive credentials in plain text.

Use secure local storage strategy.

\==================================================  
DELIVERABLE  
\==================================================

Login \+ device registration \+ authorization.

\# DESKTOP PHASE 04  
\# SQLITE LOCAL DATA LAYER

Follow DESKTOP\_POS\_MASTER\_CONTEXT.md.

\==================================================  
TASK  
\==================================================

Implement SQLite local database.

Use a reliable SQLite library compatible with Electron.

\==================================================  
DATABASE  
\==================================================

Create local schema for required desktop data.

At minimum prepare:

business  
branch  
user  
products  
categories  
customers  
inventory  
sales  
sale\_items  
payments  
sync\_queue  
sync\_conflicts  
settings

\==================================================  
IDENTIFIERS  
\==================================================

Use:

local\_id  
server\_id

where appropriate.

\==================================================  
SYNC FIELDS  
\==================================================

Prepare:

sync\_status  
created\_at  
updated\_at  
deleted\_at

where required.

\==================================================  
MIGRATIONS  
\==================================================

Create versioned local database migrations.

Future updates must not destroy existing user data.

\==================================================  
SECURITY  
\==================================================

SQLite database must remain local.

Do not expose arbitrary SQL execution to React.

Renderer should use approved services through preload.

\==================================================  
DELIVERABLE  
\==================================================

Working SQLite repository/data layer.

No full sync yet.

\# DESKTOP PHASE 05  
\# SERVER → SQLITE SYNC

Follow DESKTOP\_POS\_MASTER\_CONTEXT.md.

\==================================================  
GOAL  
\==================================================

When the device is online, download required business data into SQLite.

\==================================================  
INITIAL SYNC  
\==================================================

Sync:

Business  
Branch  
User  
Categories  
Products  
Customers  
Tax configuration  
Payment methods  
Relevant inventory  
Permissions  
Features

\==================================================  
SYNC UI  
\==================================================

Show:

Preparing device...  
Downloading products...  
Updating inventory...  
Finalizing...

Then:

Ready

\==================================================  
INCREMENTAL SYNC  
\==================================================

After initial sync, do NOT download everything again.

Use:

updated\_at  
server version  
cursor  
or another appropriate incremental strategy.

\==================================================  
ERROR  
\==================================================

If sync fails:

Keep existing valid local data.

Do not destroy SQLite.

Show retry.

\==================================================  
DELIVERABLE  
\==================================================

Reliable server-to-local sync.

\# DESKTOP PHASE 06  
\# OFFLINE-FIRST SYNC ENGINE

Follow DESKTOP\_POS\_MASTER\_CONTEXT.md.

\==================================================  
ONLINE STATUS  
\==================================================

Detect:

Online  
Offline  
Connecting  
Syncing  
Sync Error

Show status in topbar.

\==================================================  
SYNC QUEUE  
\==================================================

Create local queue for operations requiring server synchronization.

Fields should support:

operation\_id  
entity  
action  
local\_id  
payload  
created\_at  
status  
attempts  
last\_error

\==================================================  
RETRY  
\==================================================

Failed operations should retry safely.

Use controlled retry strategy.

Do not create duplicate transactions.

\==================================================  
IDEMPOTENCY  
\==================================================

Every important offline transaction must have a unique idempotency/reference key.

Example:

local transaction UUID

Server should recognize repeated sync attempts.

\==================================================  
CONFLICTS  
\==================================================

Do not silently overwrite important records.

Log conflicts.

\==================================================  
SYNC CENTER  
\==================================================

Create Settings \> Sync Status.

Show:

Pending  
Synced  
Failed  
Conflicts

\==================================================  
DELIVERABLE  
\==================================================

Working synchronization engine foundation.

\# DESKTOP PHASE 07  
\# OFFLINE POS

Follow DESKTOP\_POS\_MASTER\_CONTEXT.md.

\==================================================  
GOAL  
\==================================================

POS must continue operating when internet is unavailable.

\==================================================  
OFFLINE FEATURES  
\==================================================

Support:

Product search  
Barcode  
Cart  
Customer selection  
Cash sales  
Basic discounts if already cached  
Tax using cached configuration  
Receipt  
Local sale history

\==================================================  
SALE FLOW  
\==================================================

Offline:

Product  
↓  
Cart  
↓  
Customer  
↓  
Payment  
↓  
Create local sale  
↓  
Reduce local inventory  
↓  
Add sync queue item  
↓  
Receipt  
↓  
Sale complete

\==================================================  
SYNC  
\==================================================

When online:

Local sale  
↓  
Sync queue  
↓  
Laravel  
↓  
Server sale  
↓  
Server ID returned  
↓  
Local record marked synced

\==================================================  
IMPORTANT  
\==================================================

Do not create a second sale when retrying.

Use idempotency key.

\==================================================  
DELIVERABLE  
\==================================================

Fully functional offline POS.

\# DESKTOP PHASE 08  
\# BARCODE \+ KEYBOARD OPTIMIZATION

Follow DESKTOP\_POS\_MASTER\_CONTEXT.md.

\==================================================  
BARCODE  
\==================================================

Support standard keyboard-emulation barcode scanners.

Scanner input should:

Receive barcode  
Search local SQLite  
Add product to cart

\==================================================  
UNKNOWN BARCODE  
\==================================================

Show:

Product not found

Options:

Search Product  
Create Product if authorized  
Cancel

\==================================================  
KEYBOARD SHORTCUTS  
\==================================================

Implement appropriate shortcuts:

F2 Search  
F4 Checkout  
F8 Customer  
Esc Close dialog  
Delete Remove item  
\+ Increase quantity  
\- Decrease quantity

Do not override essential operating system/browser behavior unnecessarily.

\==================================================  
FOCUS  
\==================================================

POS should intelligently manage focus.

After adding product:

Return focus to barcode/search input.

\==================================================  
DELIVERABLE  
\==================================================

Fast keyboard/barcode POS.

\# DESKTOP PHASE 09  
\# PRINTING SYSTEM

Follow DESKTOP\_POS\_MASTER\_CONTEXT.md.

\==================================================  
PRINTER  
\==================================================

Build printer abstraction.

Support:

58mm  
80mm  
A4

\==================================================  
RECEIPT  
\==================================================

Receipt must include:

Business  
Branch  
Invoice  
Date  
Cashier  
Customer  
Items  
Quantity  
Price  
Discount  
Tax  
Total  
Payment

\==================================================  
PRINT  
\==================================================

Use Electron native printing appropriately.

Allow:

Print  
Preview where practical  
Select printer

\==================================================  
DEFAULT PRINTER  
\==================================================

Allow business/device to save default printer.

\==================================================  
ERROR  
\==================================================

If printer unavailable:

Sale must NOT disappear.

Show:

Printer unavailable

Actions:

Retry  
Choose Printer  
Continue without printing

\==================================================  
DELIVERABLE  
\==================================================

Production-ready receipt printing architecture.

\# DESKTOP PHASE 10  
\# HARDWARE INTEGRATION LAYER

Follow DESKTOP\_POS\_MASTER\_CONTEXT.md.

\==================================================  
ARCHITECTURE  
\==================================================

Create hardware abstraction layer.

Example:

HardwareService

├── Printer  
├── Barcode  
├── CashDrawer  
└── Device

Do not couple business logic directly to a specific hardware vendor.

\==================================================  
CASH DRAWER  
\==================================================

Prepare support for cash drawer opening through supported printer/hardware mechanisms.

Trigger:

After successful cash payment

Allow manual opening for authorized users if required.

\==================================================  
FAILURE  
\==================================================

Hardware failure must never corrupt a sale.

Log error.

Show user-friendly message.

\==================================================  
DELIVERABLE  
\==================================================

Hardware abstraction and cash drawer integration.

\# DESKTOP PHASE 11  
\# COMPLETE MANAGEMENT APPLICATION

Follow DESKTOP\_POS\_MASTER\_CONTEXT.md.

Now implement the management screens matching Web POS.

\==================================================  
MODULES  
\==================================================

Dashboard  
Products  
Categories  
Inventory  
Customers  
Suppliers  
Purchases  
Expenses  
Reports  
Employees  
Branches  
Settings  
Subscription

\==================================================  
RULE  
\==================================================

These screens must match the Web POS.

Do not create a different desktop design.

\==================================================  
OFFLINE  
\==================================================

Management screens should clearly indicate when functionality requires internet.

Cached read-only information may remain available.

\==================================================  
DELIVERABLE  
\==================================================

Complete desktop management application.

\# DESKTOP PHASE 12  
\# SAAS FEATURE \+ SUBSCRIPTION CONTROL

Follow DESKTOP\_POS\_MASTER\_CONTEXT.md.

\==================================================  
SUBSCRIPTION  
\==================================================

Read subscription state from Laravel.

States:

Active  
Trial  
Expired  
Suspended  
Cancelled

\==================================================  
FEATURES  
\==================================================

Respect:

POS  
Inventory  
Reports  
Multi Branch  
Advanced Reports  
etc.

\==================================================  
LIMITS  
\==================================================

Respect:

Users  
Branches  
Devices

\==================================================  
IMPORTANT  
\==================================================

Frontend checks are UX only.

Laravel must remain final authorization authority.

Never implement a client-side bypass.

\==================================================  
OFFLINE  
\==================================================

Define safe behavior when subscription validation cannot be reached.

Use previously validated device/session state according to backend policy.

Do not invent unlimited offline access.

\==================================================  
DELIVERABLE  
\==================================================

Complete SaaS enforcement.

\# DESKTOP PHASE 13  
\# APPLICATION UPDATES

Follow DESKTOP\_POS\_MASTER\_CONTEXT.md.

\==================================================  
AUTO UPDATE  
\==================================================

Implement production-ready auto-update architecture.

Support:

Windows  
macOS

\==================================================  
SAFETY  
\==================================================

Application update must NEVER delete:

SQLite database  
Pending sync queue  
Local settings  
Device registration  
Unsynced transactions

\==================================================  
UPDATE FLOW  
\==================================================

Check update  
↓  
Download  
↓  
Notify user  
↓  
Install/restart

\==================================================  
FAILURE  
\==================================================

If update fails:

Application should remain usable.

Do not corrupt local data.

\==================================================  
DELIVERABLE  
\==================================================

Safe desktop update system.

\# DESKTOP PHASE 14  
\# WINDOWS PRODUCTION BUILD

Follow DESKTOP\_POS\_MASTER\_CONTEXT.md.

\==================================================  
BUILD  
\==================================================

Create production Windows installer.

Support appropriate architecture.

\==================================================  
INSTALLATION  
\==================================================

Installer must:

Install app  
Create shortcuts  
Preserve user data  
Support upgrades

\==================================================  
DATA  
\==================================================

SQLite must live in an appropriate Electron user-data location.

Never store production SQLite inside the application installation directory.

\==================================================  
TEST  
\==================================================

Test:

Fresh install  
Login  
Device registration  
Product sync  
Offline sale  
Online sync  
Receipt printing  
Update

\==================================================  
DELIVERABLE  
\==================================================

Production-ready Windows installer.

\# DESKTOP PHASE 15  
\# macOS PRODUCTION BUILD

Follow DESKTOP\_POS\_MASTER\_CONTEXT.md.

\==================================================  
BUILD  
\==================================================

Create macOS production application.

Prepare for:

Apple Silicon  
Intel

where supported.

\==================================================  
DATA  
\==================================================

Store SQLite safely in Electron user-data directory.

\==================================================  
PERMISSIONS  
\==================================================

Handle required macOS permissions appropriately.

\==================================================  
TEST  
\==================================================

Test:

Fresh install  
Login  
Device registration  
Sync  
Offline POS  
Receipt printing  
Update

\==================================================  
DELIVERABLE  
\==================================================

Production-ready macOS build.

\# DESKTOP PHASE 16  
\# FULL DESKTOP QA

Follow DESKTOP\_POS\_MASTER\_CONTEXT.md.

\==================================================  
ONLINE TEST  
\==================================================

Test:

Login  
Dashboard  
Products  
Inventory  
Customers  
Suppliers  
Purchases  
Expenses  
POS  
Reports  
Settings  
Subscription

\==================================================  
OFFLINE TEST  
\==================================================

Disconnect internet.

Test:

Product search  
Barcode  
Cart  
Cash sale  
Receipt  
Sale history  
Inventory update  
Sync queue

\==================================================  
RECONNECT  
\==================================================

Reconnect internet.

Verify:

Queue processes  
Sales sync exactly once  
Inventory reconciles  
Server IDs assigned  
No duplicates  
No data loss

\==================================================  
FAILURE TEST  
\==================================================

Simulate:

API failure  
Timeout  
Server error  
Printer unavailable  
SQLite failure  
Sync failure  
Duplicate retry

\==================================================  
SECURITY  
\==================================================

Verify:

No nodeIntegration  
contextIsolation enabled  
No secret exposure  
IPC validated  
Unauthorized APIs blocked

\==================================================  
PERFORMANCE  
\==================================================

Test:

Large product catalog  
Fast barcode scanning  
Large sales history  
Multiple sync operations

\==================================================  
FINAL REPORT  
\==================================================

Provide:

Completed  
Failed  
Known issues  
Performance  
Security  
Offline reliability  
Sync reliability  
Hardware status  
Windows status  
macOS status

Do not start another feature automatically.

Electron Desktop  
│  
├── Main Process  
│   ├── Window  
│   ├── SQLite  
│   ├── Printer  
│   ├── Cash Drawer  
│   ├── Device  
│   └── Auto Update  
│  
├── Preload  
│   └── Secure IPC  
│  
└── React Renderer  
    │  
    ├── Dashboard  
    ├── POS  
    ├── Products  
    ├── Inventory  
    ├── Customers  
    ├── Suppliers  
    ├── Purchases  
    ├── Expenses  
    ├── Reports  
    ├── Employees  
    ├── Branches  
    ├── Settings  
    └── Subscription

                 Laravel \+ MySQL  
                       ▲  
                       │  
                 Sync API  
                       │  
              ┌────────┴────────┐  
              │                 │  
          Electron           Browser  
              │  
            SQLite  
              │  
      ┌───────┼────────┐  
      │       │        │  
    POS    Barcode   Printer  
      │                │  
   Offline          Receipt  

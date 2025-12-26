# Roadmap

### <ins>Priorities/Notes</ins>

- folders and folder placements, not handled within the shortcut grid.
- modal management can probably be handled differently (html seems cluttered) (TOP PRIORITY)
- sidebar footer section: need help, version indicator, possibly full import/export handling, reset everything moved here (partically done)
- trackers context menu should  be able to copy link (symmetry with shortcut context menu)
- trackers meta should ideally stick/flex to the bottom of the card (done)
- implement tracker dragdrop re-ordering (can honestly reuse shortcuts dragdrop)
- trackers sidebar svg that more closely resembles the ui (done)
- cycle wallpapers buttons < > similar to tablis. (if so possibly a day night cycle selection as well.. but i'd need to figure out placement)
- revisit focus stealing prevention, searchbar L 143
- aria labels: tabs, shortcuts, buttons, trackers, 

# Version History

### <ins>NT Ultra 0.8-beta</ins>

- New Setting for Custom CSS that follows active theme, in Expanded Display Section
- Tabs Browser now has extended tab management and tab groups
- Tabs can now be moved between windows or tab groups via dragdrop
- Tabs now have a dedicated context menu, basic options for reload, pin, sleep, close, etc.
- Tab Sections also have a dedicated context menu, right click to close all in a window, or put a whole group to sleep, etc.
- Correction to Label Top positionings and grid
- New searchbar providers: startpage, reddit, wikipedia, youtube
- Context Menus now dodge screen edges

https://youtu.be/GJM8STOQPOg

<!-- https://www.youtube.com/embed/GJM8STOQPOg?si=_bDPV-mAvKzXhyHp -->

### <ins>NT Ultra 0.7-beta</ins>

- Trackers Sidebar button more accurately represents the UI
- Trackers also see some internal spacing improvement
- Context menu options for turning links and tabs into shortcuts (outside of the extension)
- New Display option to hide sidebar buttons off hover
- New Searchbar feature with optional providers, enabled in Display Settings

![Vid_20251218_220526-ezgif com-resize](https://github.com/user-attachments/assets/c619020c-b3ff-477c-82ff-6624675c27ab)

### <ins>NT Ultra 0.6-beta</ins>

- Notification system introduced to replace all default (disruptive) alerts
- Option to display notifications in page or as desktop.
- Settings Sidebar restructured once again with a new Database Section
- Settings Sidebar - Database section, for handling import/export/reset operations
- Trackers module structure (rewritten)
- Trackers Sidebar collapsed position adjustment
- Trackers description for crypto/stocks adjusted
- Trackers now open in current tab on click, new tab on middle click
- Trackers can now be editted after creation. Right Click -> Edit
- Trackers can now be created from JSONs (key extraction!)
- Wallpapers can now be import/exported, note: exported files are usually ~20Kb, so wallpaper data strings make up the entire difference
- New Label Styles (animated background textures, blur, stone, shine)

### <ins>NT Ultra 0.5-beta</ins>

- Modularity has been achieved (without breaking anything) (0.5)
- Introducing "Trackers", a convenient way to track information via RSS Feeds (rss urls, github activities, yt channel activity, reddit post, crypto/stocks, weather and more)
- Modal dialogs now follow a linear left-right order, instead of right-left
- Wallpaper limits have been relaxed to a maximum of 10, 100Mb each (0.2.5)
- New Label Position options (top-left, top-right, bottom-left, bottom-right)
- Max Shortcut limit has been increased from 84 to 168
- Shortcut scale on hover style adjustments
- Adjustments to Blur Enabled UI

https://github.com/user-attachments/assets/28898a9d-e34a-455b-9ce5-32e9cf914bc6

### <ins>NT Ultra 0.2.2-beta</ins>

- Better handling of shortcut favicon loading
- Padding adjustments for the settings sidebar
- Better handling of shortcut styles via attributes
- Label border style now adaptive to custom border radius
- Better handling of imported shortcut value distribution
- New shortcut toggle to hide context menu icons (still accessible via right clicking)
- Other changes to naming conventions

### <ins>NT Ultra 0.2-beta</ins>

- Reorganized Settings tree
- Expanded settings now save on change (to the currently selected theme)
- Removed save button (unecessary extra action)
- New Wallpaper dimming setting
- New Label Styles setting(s)
- Import shortcuts settings have been expanded
- Users can now import a list of links via clipboard or file
- Users can also export their NT Ultra shortcuts via clipboard or file
- New shortcut context-menu option to copy shortcut link
- other changes to naming conventions

### <ins>NT Ultra 0.1.6-beta</ins>

- adjusted page load animation to specifically target shortcut icons instead of shortcut grid
- specify animation only for page load event

### <ins>NT Ultra 0.1.3-beta</ins>

- fixed a bug where a shortcuts drag state wasnt reset after a successful drag, resulting in click events failing
- adjusted page load animation to specifically target shortcut icons instead of shortcut grid

### <ins>NT Ultra 0.1.2-beta</ins>

- offset loading (other) wallpaper data until first sidebar interaction -> page loads instantly even with 8 massive wallpapers stored.
- offset section visibilities with page load animation (visually pleasant) ->
- adjustments to add shortcut button style
- removed unecessary pointers on drag & dropping of shortcuts (0.1.1)

### <ins>NT Ultra 0.1-beta</ins>

- <!--After months of delay, coming back and going forth, restructuring and organizing, again and again. Refining knowledge on db's, modals, and theming.. After the tarnation of a project named userChrome Companion. And after settling on a name for this New Tab Page replacement. -->NT Ultra is ready for beta.
- The creation of this repo signals the project reaching feature parity
- A need for daily usage, testing, optimizations and bug hunting, pre-distribution.
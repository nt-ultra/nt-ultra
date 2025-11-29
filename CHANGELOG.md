# Roadmap

### <ins>Priorities/Notes</ins>

- the index.js is a mess and modularity NEEDS to be addressed (more) if this project is to scale.
- some of the above would include database seperation, shortcut management seperation, settings & s-sidebar seperation, modal calls, alerts('calling on a non-disruptive noti instead of this default one'), etc, better handling of events on dom load.
- folders and folder placements, not handled within the shortcut grid.
- shortcut data needs a constant
<!--- custom rss feed with rss2json? (maybe not)-->

# Version History

### <ins>NT Ultra 0.2.5-beta</ins>

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
# Fantasy MapHub Generators

## About the project

This project is a consolidation into a single project of map generators by [watabou](https://github.com/watabou/) that he published on [watabou.github.io](https://watabou.github.io). Not all of them are publicly available, and even what is available is written in a not-so-popular language.

I took the web version with the JS implementation and made many changes to it.

The work is not finished yet; you could say that the work of restructuring the JS code into a more maintainable format hasn’t even started. But it’s already usable now: all the old functionality is preserved, and importing from files works as well.

### What was changed globally:

* These generators are now fully local. That is, they work without the internet: all connections are internal, and the downloadable files are included with the project.
* Maximum automation has been implemented. You can conveniently assemble it for your use case by interacting only with constructors and JSON parameters.
* I wrote an `openapi.json` for the generators and made it available directly through RapiDoc.
* I changed the marshalling approach to make it proto-first. For now, partially (schema export), but in the future I might take it to its logical conclusion and palettes will be implemented as well.
* I added import/export to a binary file: pure protobuf. Backward compatibility is preserved.
* I tried to standardize the context menu so that items in different generators are in the same places and have the same names. I also added functionality for those generators that didn’t have it (`Permalink...`, `Fullscreen`).
* I added the ability to open towns and villages directly in the 3D viewer (`View in 3D`).
* I made the dialogs more user-friendly (for example, City Viewer now clearly states what the problem is during import).
* I added prefixes for exported files (`*.palette.mf.json`, `*.mf.json`) so you can understand what relates to what without looking inside.
* I published it as a standalone [web resource](https://maphub.webtools.download), including a [PWA](https://en.wikipedia.org/wiki/Progressive_web_app), which makes it possible to install it as an application that doesn’t require the internet.

### Plans for the future:

* Move palette import/export to proto.
* Add export for the Cave/Glade Generator.
* Add the ability to import schemas from a file for all generators except City Viewer (since City Viewer already has import).
* Add a 3D visualizer for buildings (separate or simply expand City Viewer’s functionality).
* Add an extended export mode that transfers names, labels, and other fields.
* Add generation of Cave/Glade pointers in the Medieval-Fantasy-City/Village Generator.
* After extended export, it will be possible to link the Cave/Glade/Dwellings Generator and the Medieval-Fantasy-City/Village Generator.
* Make it separately buildable, or extend the current one, with a list of saved maps and palettes directly in the app.

## Gallery

### How the context menu changed

#### Cave/Glade Generator

![to\_cave](.github/img/to_cave.png)

#### Dwellings Generator

![to\_dwellings](.github/img/to_dwellings.png)

#### Village Generator

![to\_village](.github/img/to_village.png)

#### Medieval-Fantasy-City Generator

![to\_mfcg](.github/img/to_mfcg.png)

#### City Viewer

![to\_viewer](.github/img/to_viewer.png)

### Example of the installed app

#### Installed on a phone: a separate icon, works even without the internet

![to\_village](.github/img/mob_app.jpg)

#### Example of working without the internet

![to\_village](.github/img/mob_city.jpg)

## CONTRIBUTING

If you want to join or just fix a bug, send a pull request with a description.

## LICENSE

The source code is published under MPL-2.0.

Contact email: [mail@sunsung.fun](mailto:mail@sunsung.fun).

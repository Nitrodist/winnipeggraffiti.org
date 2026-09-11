# WinnipegGraffiti.org

I am planning on building a website that hosts images, pages, categories, maps,
and more related to graffiti art and outdoor art in Winnipeg and Manitoba.

I am planning on building the site using Astro as a static site generator and
then host the website on Cloudflare pages. I have previously built a site,
cheapmlcc.ca, with Astro and hosted it with Cloudflare pages. I would like to
replicate it entirely as I think its techniques are excellent. Its code has
been cloned into the `cheapmlcc-copy` directory for you to copy and use.

Within there, there are scripts to scrape a website. We don't need that at all.
However, the output of it was useful as it produced JSONL files
(https://jsonltools.com/what-is-jsonl) where each line is a valid JSON value
and it also represents a valid 'row' in our 'database' where each JSONL file
represents a table in our 'database', so-to-speak.

I would like to use the same structure. Instead of those existing files,
though, we will have a new file called 'arts.jsonl' and each record is an art
record with attributes like name, location that is an OpenStreetmaps
https://www.openstreetmap.org compatible value, an artist name, an artist_id
representing a record in the artists.jsonl related data structure. I would also
like to have a regions of Winnipeg list with the following entries:

```
The North End
Luxton
St. John's
Burrows
William Whyte
The West End
Minto
Polo Park
West Wolseley
Daniel McIntyre
Corydon Village
Crescentwood
West Broadway
The Forks
Chinatown
Exchange District
Point Douglas
Weston
Amber Trails
Seven Oaks
Glenelm
Chalmers
Windsor Park
Linden Ridge
Deer Lodge
Varsity View
Old Tuxedo
Headingly
Osborne Village
St. Boniface
Transcona
St. James
Garden City
The Maples
St. Vital
Fort Garry
Downtown
Wolseley
Elmwood
Silver Heights
Sturgeon Creek
Assiniboia Downs
Westwood
Welington Crescent
Charleswood
Assiniboine Park
Assiniboine Forest
Tuxedo
River Heights
West Kildonan
Tyndall Park
Kildonan Park
Riverdale
Rivergrove
North Kildonan
East Kildonan
Rossmere
East Saint Paul
West Saint Paul
North Transcona
Transcona Yards
Symington Yards
Sage Creek
Island Lakes
Southdale
Fort Richmond
Richmond West
Waverley Heights
University of Manitoba
Kings Park
St. Norbert
Bridgwater
Fort Whyte
Waverley West
South Point
Linden Woods
Whyte Ridge
Grant Park
```

I would like to optionally have a artist name and a artist record (represented
by artist_id) where we always display the artist name and then when there is a
related artist record then we link to it and display it on an artist page of
the Astro website. On the artist page, it needs to have all of the information
of the Artist and then a list of their art records (with hyperlinks of course).

On the home screen, we should have a last 5 arts listing and we should have a
map of tags in Winnipeg, using OpenStreetMap (of course).

We need a dedicated map of Winnipeg page with links to (our) regions of
Winnipeg and on those pages we need to show that region and show a map with
that region centred, as well as a html table listing of each art in that
section.

We need individual 'art' pages (identified by their ID record). On the page it
should show the image, all of the related information of the art record, and a
map of where it is in Winnipeg.

To add items, we need to have a way to accept a list (probably a directory...)
of files to import and then use the metadata attached to it to populate the
record. Missing information should be prompted to the user. Somehow. Because
we're developing this using a terminal, we will opt for a terminal UI to prompt
for missing information per imported record. Ideally we use a `npm run ...`
script to handle this kind of import process.

When we are setting the cateogry / tag of an item, I would like to have
separate tags / categories for 'graffiti' and for 'outdoor art'.


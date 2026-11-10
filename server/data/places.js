'use strict';
// Every real-world place from your lists becomes a landmark on the map.
// theme = which kind of region it is placed in, kind = which footprint builder draws it, loot = loot table.
const P = (cat, theme, kind, loot, names) => ({cat, theme, kind, loot, names: names.split('|')});

module.exports = [
  // ───────── SPORTS ─────────
  P('Football Stadium','sports','stadium','stadium','Spotify Camp Nou|Santiago Bernabéu|Wembley Stadium|Estádio do Maracanã|San Siro|Allianz Arena|Estadio Azteca|La Bombonera|Old Trafford|Signal Iduna Park'),
  P('Cricket Ground','sports','stadium','stadium','Narendra Modi Stadium|Melbourne Cricket Ground|Lord\'s Cricket Ground|Eden Gardens|Sydney Cricket Ground|The Oval|Adelaide Oval|Newlands Cricket Ground|Wankhede Stadium|Gaddafi Stadium'),
  P('Basketball Arena','sports','arena','stadium','Madison Square Garden|TD Garden|Crypto.com Arena|United Center|Stark Arena|Golden 1 Center|Chase Center|Peace and Friendship Stadium|Intuit Dome|OAKA Olympic Indoor Hall'),
  P('Tennis Court','sports','court','stadium','Centre Court Wimbledon|Arthur Ashe Stadium|Court Philippe-Chatrier|Rod Laver Arena|Indian Wells Stadium 1|Campo Centrale Foro Italico|Court Rainier III|Court Suzanne-Lenglen|Louis Armstrong Stadium|Inalpi Arena'),
  P('American Football Stadium','sports','stadium','stadium','Lambeau Field|AT&T Stadium|SoFi Stadium|Arrowhead Stadium|Rose Bowl Stadium|Lumen Field|Caesars Superdome|Allegiant Stadium|Michigan Stadium|Mercedes-Benz Stadium'),
  P('F1 Circuit','sports','circuit','circuit','Circuit de Spa-Francorchamps|Circuit de Monaco|Silverstone Circuit|Suzuka Circuit|Autodromo Nazionale Monza|Interlagos|Circuit Gilles Villeneuve|Circuit of the Americas|Red Bull Ring|Yas Marina Circuit'),
  P('Golf Course','sports','golf','golf','Augusta National|St Andrews Old Course|Pebble Beach Golf Links|Pine Valley Golf Club|Royal County Down|Shinnecock Hills|TPC Sawgrass|Muirfield|Oakmont Country Club|Cypress Point Club'),
  P('Ice Hockey Arena','sports','arena','stadium','Bell Centre|MSG Rangers Rink|Scotiabank Arena|T-Mobile Arena|Wells Fargo Center|Bridgestone Arena|Nokia Arena|Lanxess Arena|PPG Paints Arena|Rogers Place'),
  P('Rugby Stadium','sports','stadium','stadium','Twickenham Stadium|Principality Stadium|Stade de France|Ellis Park Stadium|Eden Park|Aviva Stadium|Murrayfield Stadium|Loftus Versfeld|Suncorp Stadium|Estadio José Amalfitani'),
  P('Ballpark','sports','stadium','stadium','Fenway Park|Wrigley Field|Yankee Stadium|Dodger Stadium|Oracle Park|PNC Park|Hanshin Koshien Stadium|Tokyo Dome|Petco Park|Busch Stadium'),

  // ───────── CITY ─────────
  P('Airport','city','airport','airport','Singapore Changi Airport|Hamad International Airport|Mumbai CSMIA|London Heathrow|Hartsfield–Jackson Atlanta|Tokyo Haneda|Dubai International|Incheon International|Charles de Gaulle Airport|Indira Gandhi International'),
  P('Police HQ','city','building','police','New Scotland Yard|One Police Plaza|Paris Prefecture of Police|Tokyo Metropolitan Police HQ|Mumbai Police Commissionerate|Hong Kong Police HQ|Berlin Police HQ|RCMP Headquarters|Sydney Police Centre|LAPD Headquarters'),
  P('Shopping Mall','city','mall','mall','The Dubai Mall|Mall of America|ICONSIAM|Phoenix Marketcity|Westfield London|SM Mall of Asia|Lotte World Mall|West Edmonton Mall|Mall of Berlin|Select CITYWALK'),
  P('Fire Station','city','building','fire','FDNY Engine 33 / Ladder 9|London Fire Brigade HQ|Tokyo Fire Department HQ|Caserne Chasseloup-Laubat|Mumbai Fire Brigade HQ|SCDF Central Fire Station|LAFD Fire Station 1|Berliner Feuerwehr Hauptfeuerwache|Toronto Fire Station 332|City of Sydney Fire Station'),
  P('High Court','city','big','gov','Supreme Court of India|Supreme Court of the United States|Royal Courts of Justice|Palais de Justice|Supreme Court of Japan|Justizpalast Vienna|High Court of Australia|Supreme Court of Canada|Bombay High Court|Palazzo di Giustizia'),
  P('Botanical Garden','city','park','nature','Royal Botanic Gardens Kew|Singapore Botanic Gardens|New York Botanical Garden|Jardin des Plantes|Indian Botanic Garden Kolkata|Brooklyn Botanic Garden|Royal Botanic Garden Sydney|Botanischer Garten Berlin|Kirstenbosch|Koishikawa Botanical Gardens'),
  P('Bazaar','city','market','market','Grand Bazaar|Khan el-Khalili|Chandni Chowk|Souq Waqif|Souq Mutrah|Medina of Fez|Nishiki Market|Tehran Grand Bazaar|T. Nagar Bazaar|Namdaemun Market'),
  P('Olympic Park','city','complex','stadium','Beijing Olympic Green|Queen Elizabeth Olympic Park|Munich Olympiapark|Sydney Olympic Park|Montreal Olympic Park|Seoul Olympic Park|Barra Olympic Park|Athens Olympic Sports Complex|Kalinga Stadium Complex|Lluís Companys Olympic Park'),
  P('University Campus','city','complex','campus','University of Oxford|Harvard University|University of Cambridge|Stanford University|University of Tokyo Hongo|IIT Bombay|Sorbonne University|NUS Kent Ridge|ETH Zurich|University of Melbourne'),
  P('Convention Centre','city','mall','mall','Jio World Centre|Tokyo Big Sight|McCormick Place|Messe Frankfurt|ExCeL London|Paris Nord Villepinte|NECC Shanghai|Sands Expo|Las Vegas Convention Center|Bharat Mandapam'),

  // ───────── CULTURE ─────────
  P('Art Museum','culture','big','museum','The Louvre|Tate Modern|MoMA|Rijksmuseum|Uffizi Gallery|National Gallery of Art|Guggenheim Bilbao|NGMA New Delhi|Centre Pompidou|State Tretyakov Gallery'),
  P('Science Centre','culture','big','science','Hayden Planetarium|Science Museum London|Cité des Sciences|National Science Centre Delhi|Miraikan|Deutsches Museum|California Science Center|Science City Kolkata|ArtScience Museum|Adler Planetarium'),
  P('Bus Terminal','culture','busterminal','transit','Port Authority Bus Terminal|Koyambedu CMBT|Victoria Coach Station|Paris-Bercy Coach Station|Bangkok Southern Bus Terminal|Busan Central Bus Terminal|ZOB Berlin|Kashmere Gate ISBT|Terminal Tietê|Pudu Sentral'),
  P('Waterfront','culture','waterfront','transit','Marine Drive|Navy Pier|The Bund|Victoria Harbour Promenade|Santa Monica Pier|South Bank Promenade|Circular Quay|Clarke Quay|Rambla de Mar|Sabarmati Riverfront'),
  P('Fort','culture','fort','military','Red Fort|Tower of London|The Kremlin|Edinburgh Castle|Mehrangarh Fort|Himeji Castle|Castel Sant\'Angelo|Prague Castle|Citadel of Cairo|Amer Fort'),
  P('Zoo','culture','zoo','nature','San Diego Zoo|Singapore Zoo|London Zoo|Zoo Berlin|Tiergarten Schönbrunn|Vandalur Zoo|Bronx Zoo|Taronga Zoo|Lisbon Zoo|Ueno Zoo'),
  P('National Archive','culture','building','gov','The National Archives Kew|NARA Washington|Archives Nationales|National Archives of India|National Archives of Japan|Bundesarchiv|State Records NSW|National Archives of Singapore|Archivio Centrale dello Stato|General Archive of the Indies'),
  P('Central Bank','culture','bank','gov','Reserve Bank of India|Federal Reserve Eccles Building|Bank of England|ECB Tower|Bank of Japan|People\'s Bank of China|Banque de France|Monetary Authority of Singapore|Swiss National Bank|Reserve Bank of Australia'),
  P('Aquarium','culture','aquarium','mall','Georgia Aquarium|S.E.A. Aquarium|Okinawa Churaumi Aquarium|Monterey Bay Aquarium|Dubai Aquarium|L\'Oceanogràfic|Lisbon Oceanarium|Taraporevala Aquarium|Acquario di Genova|SEA LIFE Sydney'),
  P('Post Office','culture','building','house','James A. Farley Building|GPO Mumbai|Mount Pleasant Mail Centre|Tokyo Central Post Office|GPO Dublin|Sydney GPO|La Poste Central Paris|Kolkata GPO|Hong Kong GPO|Palacio de Comunicaciones'),

  // ───────── GOVERNMENT ─────────
  P('Parliament','gov','capitol','gov','Samvidhan Sadan|Palace of Westminster|United States Capitol|Reichstag Building|National Diet Building|Palais Bourbon|Parliament House Canberra|Parliament Hill Ottawa|Great Hall of the People|Bunge la Tanzania'),
  P('Head of State Residence','gov','palace','gov','Rashtrapati Bhavan|The White House|Élysée Palace|Buckingham Palace|Quirinal Palace|Zhongnanhai|Tokyo Imperial Palace|Kantei|Bellevue Palace|Palácio da Alvorada'),
  P('Diplomatic Enclave','gov','complex','military','Chanakyapuri|Embassy Row|Belgravia Embassy District|Riyadh Diplomatic Quarter|Nine Elms Diplomatic Zone|7th Arrondissement Embassies|BKC Consulate Complex|Minato Embassy District|Yarralumla Diplomatic Sector|Tiergarten Diplomatic Quarter'),
  P('International HQ','gov','big','military','United Nations Headquarters|Palais des Nations|Berlaymont Building|African Union Headquarters|NATO Headquarters|Peace Palace|ASEAN Secretariat|Arab League Headquarters|UNESCO Headquarters|International Criminal Court'),
  P('State Secretariat','gov','building','gov','Mantralaya|Vidhana Soudha|Nabanna|New York State Capitol|California State Capitol|Hôtel de Région Île-de-France|Parliament of New South Wales|Queen\'s Park|Bavarian State Chancellery|Telangana Secretariat'),
  P('Municipal Office','gov','building','gov','BMC A Ward Office|MCD Zonal Office|Shinjuku City Office|Mairie du 4e|Camden Town Hall|Manhattan Borough Hall|BBMP Zonal Office|KMC Borough Office|Chicago District Office|Hong Kong District Council'),
  P('Revenue Authority','gov','building','gov','CBDT North Block|IRS Headquarters|HMRC 100 Parliament Street|National Tax Agency Japan|DGFiP Paris|BZSt Bonn|State Taxation Administration|ATO Headquarters|IRAS Revenue House|CRA Headquarters'),
  P('Electoral Commission','gov','building','gov','Nirvachan Sadan|Federal Election Commission|The Electoral Commission UK|Australian Electoral Commission|Elections Canada|Commission Électorale Nationale|Elections Department Singapore|IEC South Africa|Central Election Commission Taipei|National Election Commission Korea'),
  P('Land Registry','gov','building','gov','IGR Maharashtra|HM Land Registry|NYC City Register|Service de la Publicité Foncière|Legal Affairs Bureau Tokyo|NSW Land Registry Services|Singapore Land Authority|Hong Kong Land Registry|Deeds Registry Pretoria|Kadaster'),
  P('Audit Office','gov','building','gov','Comptroller and Auditor General|Government Accountability Office|National Audit Office UK|Cour des Comptes|Board of Audit of Japan|Bundesrechnungshof|Lokpal of India|National Audit Office of China|Australian National Audit Office|European Court of Auditors'),

  // ───────── HISTORIC ─────────
  P('Cathedral','historic','cathedral','historic','Notre-Dame de Paris|St. Peter\'s Basilica|Florence Cathedral|Cologne Cathedral|Milan Cathedral|Chartres Cathedral|St. Paul\'s Cathedral|Seville Cathedral|Salisbury Cathedral|St. Stephen\'s Cathedral'),
  P('Royal Palace','historic','palace','museum','Palace of Versailles|The Forbidden City|Topkapi Palace|Mysore Palace|Schönbrunn Palace|Winter Palace|Alhambra|Royal Palace of Madrid|Grand Palace Bangkok'),
  P('Pyramid','historic','pyramid','museum','Great Pyramid of Giza|El Castillo|Pyramid of the Sun|Great Ziggurat of Ur|Tikal Temple I|Red Pyramid|Pyramid of Cestius|Choqa Zanbil|Pyramids of Meroë|Brihadisvara Vimana'),
  P('Amphitheatre','historic','amphi','historic','The Colosseum|Amphitheatre of El Jem|Verona Arena|Pula Arena|Theatre of Epidaurus|Arles Amphitheatre|Amphitheatre of Nîmes|Odeon of Herodes Atticus|Bosra Roman Theatre|Pompeii Amphitheatre'),
  P('Citadel','historic','fort','military','Citadel of Aleppo|Spiš Castle|Krak des Chevaliers'),
  P('Historic Mosque','historic','mosque','historic','Hagia Sophia|Blue Mosque|Sheikh Lotfollah Mosque|Mezquita of Córdoba|Jama Masjid|Al-Aqsa Mosque|Al-Azhar Mosque|Great Mosque of Djenné|Badshahi Mosque|Faisal Mosque'),
  P('Rock-Cut Temple','historic','rockcut','museum','Kailasa Temple Ellora|Al-Khazneh Petra|Ajanta Caves|Abu Simbel|Mogao Caves|Elephanta Caves|Rock-Hewn Churches of Lalibela|Longmen Grottoes|Badami Cave Temples|Dambulla Cave Temple'),
  P('Classical Temple','historic','temple','historic','The Parthenon|The Pantheon|Temple of Hephaestus|Maison Carrée|Temple of Bacchus|Temple of Concordia|Temple of Poseidon|Temple of Apollo Delphi|Temple of Edfu|Temple of Hera'),
  P('Mausoleum','historic','mausoleum','historic','Taj Mahal|Mausoleum of Hadrian|Humayun\'s Tomb|Terracotta Army|Mausoleum at Halicarnassus|Lenin\'s Mausoleum|Guri Amir|Gol Gumbaz|Anıtkabir|Tomb of Jahangir'),
  P('Aqueduct','historic','aqueduct','historic','Pont du Gard|Aqueduct of Segovia|Aqueduct of Valens|Aqua Claudia|Pont del Diable|Aqueduct of Vanvitelli|Águas Livres Aqueduct|Kamares Aqueduct Kavala|Aqueduct of Pegões|Hampi Stone Aqueducts'),

  // ───────── RURAL ─────────
  P('Terraces','rural','terrace','rural','Banaue Rice Terraces|Jatiluwih Rice Terraces|Longji Rice Terraces|Mu Cang Chai Terraces|Salineras de Maras|Lavaux Vineyard Terraces|Cinque Terre Terraces|Hani Rice Terraces|Sapa Valley Terraces|Annapurna Foothill Terraces'),
  P('Stepwell','rural','stepwell','rural','Chand Baori|Rani ki Vav|Adalaj Stepwell|Agrasen ki Baoli|Toorji Ka Jhalra|Subak Water Temples|Qanats of Gonabad|Falaj of Al Ain|Roman Cisterns of Fermo|Birkat Al-Mawz Falaj'),
  P('Rural Market','rural','market','market','Pushkar Camel Fair|Azadpur Mandi|Otavalo Market|Chichicastenango Market|Cirencester Farmers Market|Bac Ha Sunday Market|Rungis Annex|Sonpur Cattle Fair|Kashgar Sunday Market|Aalsmeer Flower Auction'),
  P('Country Estate','rural','estate','gov','Biltmore Estate|Chatsworth House|Hacienda San Antonio|Waddesdon Manor|Villa La Rotonda|Stowe House|Boone Hall Plantation|Château de Cheverny|Château de Chenonceau|Hacienda Chichen'),
  P('Monastery','rural','monastery','historic','Meteora|Paro Taktsang|Mont Saint-Michel|Rila Monastery|Saint Catherine\'s Monastery|Sumela Monastery|Key Monastery|Hemis Monastery|Abbey of Sénanque|Montserrat Abbey'),
  P('Grain Silos','rural','silo','rural','DeBruce Grain Elevator|Inglewood Grain Elevator|Port Giles Grain Terminal|Fargo Co-op Silos|Saskatchewan Heritage Elevators|FCI Khanna Depot|Moga Grain Silos|Bunge Rosario Terminal|CBH Avon Valley Silos|Wimmera Silo Trail'),
  P('Dam','rural','dam','rural','Hoover Dam|Three Gorges Dam|Tehri Dam|Bhakra Nangal Dam|Aswan High Dam|Itaipu Dam|Kariba Dam|Nagarjuna Sagar Dam|Grand Coulee Dam|Glen Canyon Dam'),
  P('Mountain Pass','alpine','pass','military','Khardung La|Stelvio Pass|Brenner Pass|Sela Pass|Khyber Pass|Gotthard Pass|Rohtang La|Tioga Pass|Sani Pass|Nathu La'),
  P('Village Green','rural','green','house','Finchingfield Green|Grasmere Village Green|Ralegan Siddhi Maidan|Kizhi Pogost|Shirakawa-go Square|Woodstock Village Green|Zaanse Schans Commons|Hampi Bazaar Grounds|Lexington Common|Mawlynnong Village'),
  P('Windmills','rural','windmill','rural','Kinderdijk Windmills|Consuegra Windmills|Zaanse Schans Windmills|Kato Mili Mykonos|Chesterton Windmill|Mabry Watermill|Old Mill at Berry College|Dugny Watermills|Ockley Watermill|Kastelruth Watermills'),

  // ───────── NATURAL TERRAIN ─────────
  P('Mountain','alpine','mountain','nature','Mount Everest|K2|Mont Blanc|Denali|Aconcagua|Matterhorn|Kilimanjaro|Mount Fuji|Kanchenjunga|Eiger'),
  P('Canyon','canyon','canyon','nature','Grand Canyon|Fish River Canyon|Tara River Canyon|Blyde River Canyon|Kali Gandaki Gorge|Copper Canyon|Yarlung Tsangpo Canyon|Gorges du Verdon|Colca Canyon|Vikos Gorge'),
  P('Plateau','canyon','plateau','nature','Tibetan Plateau|Deccan Plateau|Colorado Plateau|Table Mountain|Mount Roraima|Altiplano|Auyán-tepui|Kimberley Plateau|Anatolian Plateau|Potohar Plateau'),
  P('Desert','desert','desert','nature','Sahara Erg Chebbi|Atacama Desert|Namib Sossusvlei|Gobi Desert|Thar Desert|Taklamakan Desert|Kalahari Desert|Death Valley Mojave|Simpson Desert|Lençóis Maranhenses'),
  P('Volcano','volcanic','volcano','nature','Mauna Loa & Kilauea|Mount Vesuvius|Ngorongoro Crater|Yellowstone Caldera|Giant\'s Causeway|Santorini Caldera|Mount Etna|Fagradalsfjall|Dallol Crater|Deccan Traps'),
  P('Karst','karst','karst','nature','Guilin Karst Towers|Ha Long Bay|Mammoth Cave|Postojna & Škocjan Caves|Great Blue Hole|Chocolate Hills|Tsingy de Bemaraha|Son Doong Cave|Jeita Grotto|Waitomo Glowworm Caves'),
  P('Glacier','alpine','glacier','nature','Lambert Glacier|Sermeq Kujalleq|Perito Moreno Glacier|Vatnajökull|Siachen Glacier|Athabasca Glacier|Franz Josef Glacier|Gangotri Glacier|Aletsch Glacier|Baltoro Glacier'),
  P('River Delta','lakes','delta','nature','Sundarbans|Nile Delta|Mississippi Delta|Okavango Delta|Mekong Delta|Amazon Estuary|Pantanal|Danube Delta|Camargue|Irrawaddy Delta'),
  P('Coastal Cliffs','coast','cliff','nature','Cliffs of Moher|White Cliffs of Dover|Twelve Apostles|Kelingking Cliff|Étretat Arches|Na Pali Coast|Cap de Formentor|Gozo Sea Arches'),
  P('Fjord','coast','fjord','nature','Milford Sound|Geirangerfjord|Sognefjord|Tracy Arm Fjord|Ilulissat Icefjord|Kenai Fjords|Bay of Kotor|Patagonian Fjords|Scoresby Sund|Loch Fyne'),
  P('Salt Flat','saltflat','saltflat','nature','Salar de Uyuni|Rann of Kutch|Bonneville Salt Flats|Chott el Djerid|Salar de Atacama|Badwater Basin|Etosha Pan|Lake Eyre|Salinas Grandes|Makgadikgadi Pans'),

  // ───────── WATER ─────────
  P('Waterfall','canyon','waterfall','nature','Angel Falls|Victoria Falls|Iguazu Falls|Niagara Falls|Jog Falls|Yosemite Falls|Dudhsagar Falls|Plitvice Waterfalls|Gullfoss|Sutherland Falls'),
  P('Lake','lakes','lake','nature','Lake Baikal|Lake Superior|Lake Titicaca|Crater Lake|Lake Tanganyika|Vembanad Lake|Lake Geneva|Pangong Tso|Lake Como|Lake Louise'),
  P('Coral Reef','reef','reef','nature','Great Barrier Reef|Belize Barrier Reef|Maldivian Atolls|Tubbataha Reefs|Lakshadweep Atolls|Raja Ampat|Aldabra Atoll|Bikini Atoll|Palau Barrier Reef|Andaman Reefs'),
  P('Geyser Field','volcanic','geyser','nature','Old Faithful|Strokkur & Geysir|El Tatio Geysers|Champagne Pool|Manikaran Hot Springs|Dallol Hydrothermal Pools|Valley of Geysers|Pamukkale|Ganeshpuri Hot Springs|Blue Lagoon'),
  P('Underground River','karst','cenote','nature','Puerto Princesa Underground River|Sac Actun & Dos Ojos|Cenote Ik Kil|Trebišnjica River|Son Doong Cave River|Krem Liat Prah|Labouiche River|Styx River Tasmania|Vjetrenica Cave|Cueva de los Verdes'),
  P('Strait','reef','strait','nature','Strait of Gibraltar|Strait of Malacca|Bosporus|Strait of Hormuz|Bering Strait|Palk Strait|Strait of Magellan|Cook Strait|English Channel|Bab-el-Mandeb'),
  P('Lagoon','lakes','lagoon','nature','Venetian Lagoon|Chilika Lake|Kerala Backwaters|Curonian Lagoon|Mar Chiquita|Laguna Madre|Pulicat Lake|Lagos Lagoon|Fleet Lagoon|Gippsland Lakes'),
  P('Glacial Lake','alpine','subglacial','nature','Lake Vostok|Jökulsárlón|Imja Tsho|Tsho Rolpa|Lake Ellsworth|Tasman Glacier Lake|South Lhonak Lake|Merzbacher Lake|Lake Mercer|Laguna de los Tres'),
  P('Salt Lake','saltflat','saltlake','nature','Dead Sea|Great Salt Lake|Lake Retba|Lake Natron|Sambhar Salt Lake|Lake Van|Lake Assal|Mono Lake|Laguna Colorada|Don Juan Pond'),
];

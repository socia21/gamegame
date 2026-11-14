'use strict';
// Curated world landmarks — prioritized for spatial clarity, architectural variety, and clean district identity.
// theme = region biome/district, kind = structural footprint builder, loot = loot table.
const P = (cat, theme, kind, loot, names) => ({cat, theme, kind, loot, names: names.split('|')});

module.exports = [
  // ───────── SPORTS ─────────
  P('Football Stadium','sports','stadium','stadium','Spotify Camp Nou|Santiago Bernabéu|Wembley Stadium|Estádio do Maracanã|San Siro'),
  P('Cricket Ground','sports','stadium','stadium','Narendra Modi Stadium|Melbourne Cricket Ground|Lord\'s Cricket Ground'),
  P('Basketball Arena','sports','arena','stadium','Madison Square Garden|Crypto.com Arena|United Center'),
  P('Tennis Court','sports','court','stadium','Centre Court Wimbledon|Arthur Ashe Stadium|Court Philippe-Chatrier|Rod Laver Arena'),
  P('American Football Stadium','sports','stadium','stadium','Lambeau Field|AT&T Stadium|Rose Bowl Stadium'),
  P('F1 Circuit','sports','circuit','circuit','Circuit de Spa-Francorchamps|Circuit de Monaco|Silverstone Circuit|Suzuka Circuit|Autodromo Nazionale Monza'),
  P('Golf Course','sports','golf','golf','Augusta National|St Andrews Old Course|Pebble Beach Golf Links'),
  P('Ice Hockey Arena','sports','arena','stadium','Bell Centre|Scotiabank Arena|T-Mobile Arena'),
  P('Ballpark','sports','stadium','stadium','Fenway Park|Wrigley Field|Yankee Stadium|Tokyo Dome'),

  // ───────── CITY & CIVIC CORE ─────────
  P('Airport','city','airport','airport','Singapore Changi Airport|London Heathrow|Tokyo Haneda|Dubai International|Charles de Gaulle Airport'),
  P('Police HQ','city','building','police','New Scotland Yard|One Police Plaza|Tokyo Metropolitan Police HQ|LAPD Headquarters'),
  P('Shopping Mall','city','mall','mall','The Dubai Mall|Mall of America|ICONSIAM|Westfield London|Lotte World Mall'),
  P('Fire Station','city','building','fire','FDNY Engine 33 / Ladder 9|London Fire Brigade HQ|Tokyo Fire Department HQ'),
  P('High Court','city','big','gov','Supreme Court of the United States|Royal Courts of Justice|Palais de Justice|Supreme Court of Japan'),
  P('Botanical Garden','city','park','nature','Royal Botanic Gardens Kew|Singapore Botanic Gardens|New York Botanical Garden|Jardin des Plantes'),
  P('Bazaar','city','market','market','Grand Bazaar|Khan el-Khalili|Chandni Chowk|Nishiki Market'),
  P('Olympic Park','city','complex','stadium','Beijing Olympic Green|Queen Elizabeth Olympic Park|Munich Olympiapark'),
  P('University Campus','city','complex','campus','University of Oxford|Harvard University|University of Cambridge|Stanford University|University of Tokyo Hongo|IIT Bombay|ETH Zurich'),
  P('Hospital','city','hospital','hospital','Johns Hopkins Hospital|Mayo Clinic|Massachusetts General Hospital|Charité Berlin|Mount Sinai Hospital|Singapore General Hospital'),
  P('Military Base','rural','milbase','military','The Pentagon|Fort Liberty|Area 51 Groom Lake|Ramstein Air Base|Cheyenne Mountain Complex|Yokosuka Naval Base|Aldershot Garrison|Camp Humphreys'),
  P('Convention Centre','city','mall','mall','Tokyo Big Sight|McCormick Place|ExCeL London'),

  // ───────── CULTURE ─────────
  P('Art Museum','culture','big','museum','The Louvre|Tate Modern|MoMA|Rijksmuseum|Uffizi Gallery|Guggenheim Bilbao'),
  P('Science Centre','culture','big','science','Hayden Planetarium|Science Museum London|Cité des Sciences|Miraikan|Deutsches Museum'),
  P('Bus Terminal','culture','busterminal','transit','Port Authority Bus Terminal|Victoria Coach Station|Kashmere Gate ISBT|Terminal Tietê'),
  P('Waterfront','culture','waterfront','transit','Marine Drive|Navy Pier|The Bund|Victoria Harbour Promenade|Santa Monica Pier'),
  P('Fort','culture','fort','military','Red Fort|Tower of London|The Kremlin|Edinburgh Castle|Himeji Castle|Prague Castle'),
  P('Zoo','culture','zoo','nature','San Diego Zoo|Singapore Zoo|London Zoo|Zoo Berlin'),
  P('National Archive','culture','building','gov','The National Archives Kew|NARA Washington|Archives Nationales'),
  P('Central Bank','culture','bank','gov','Reserve Bank of India|Federal Reserve Eccles Building|Bank of England|ECB Tower|Bank of Japan'),
  P('Aquarium','culture','aquarium','mall','Georgia Aquarium|S.E.A. Aquarium|Okinawa Churaumi Aquarium|Monterey Bay Aquarium'),
  P('Post Office','culture','building','house','James A. Farley Building|GPO Mumbai|Tokyo Central Post Office'),

  // ───────── GOVERNMENT ─────────
  P('Parliament','gov','capitol','gov','Palace of Westminster|United States Capitol|Reichstag Building|National Diet Building|Samvidhan Sadan'),
  P('Head of State Residence','gov','palace','gov','Rashtrapati Bhavan|The White House|Élysée Palace|Buckingham Palace|Tokyo Imperial Palace'),
  P('Diplomatic Enclave','gov','complex','military','Chanakyapuri|Embassy Row|Belgravia Embassy District|Tiergarten Diplomatic Quarter'),
  P('International HQ','gov','big','military','United Nations Headquarters|Palais des Nations|NATO Headquarters|Peace Palace|UNESCO Headquarters'),
  P('State Secretariat','gov','building','gov','Vidhana Soudha|New York State Capitol|California State Capitol|Mantralaya'),
  P('Municipal Office','gov','building','gov','Shinjuku City Office|Camden Town Hall|Manhattan Borough Hall'),

  // ───────── HISTORIC ─────────
  P('Cathedral','historic','cathedral','historic','Notre-Dame de Paris|St. Peter\'s Basilica|Florence Cathedral|Cologne Cathedral|Milan Cathedral|St. Paul\'s Cathedral'),
  P('Royal Palace','historic','palace','museum','Palace of Versailles|The Forbidden City|Topkapi Palace|Mysore Palace|Schönbrunn Palace|Alhambra'),
  P('Pyramid','historic','pyramid','museum','Great Pyramid of Giza|El Castillo|Pyramid of the Sun|Great Ziggurat of Ur|Tikal Temple I'),
  P('Amphitheatre','historic','amphi','historic','The Colosseum|Amphitheatre of El Jem|Verona Arena|Theatre of Epidaurus'),
  P('Citadel','historic','fort','military','Citadel of Aleppo|Spiš Castle|Krak des Chevaliers'),
  P('Historic Mosque','historic','mosque','historic','Hagia Sophia|Blue Mosque|Mezquita of Córdoba|Jama Masjid|Great Mosque of Djenné'),
  P('Rock-Cut Temple','historic','rockcut','museum','Kailasa Temple Ellora|Al-Khazneh Petra|Ajanta Caves|Abu Simbel|Rock-Hewn Churches of Lalibela'),
  P('Classical Temple','historic','temple','historic','The Parthenon|The Pantheon|Temple of Apollo Delphi|Temple of Edfu'),
  P('Mausoleum','historic','mausoleum','historic','Taj Mahal|Mausoleum of Hadrian|Humayun\'s Tomb|Terracotta Army'),
  P('Aqueduct','historic','aqueduct','historic','Pont du Gard|Aqueduct of Segovia|Aqua Claudia|Pont del Diable'),

  // ───────── RURAL & INDUSTRY ─────────
  P('Terraces','rural','terrace','rural','Banaue Rice Terraces|Jatiluwih Rice Terraces|Longji Rice Terraces|Salineras de Maras|Lavaux Vineyard Terraces'),
  P('Stepwell','rural','stepwell','rural','Chand Baori|Rani ki Vav|Adalaj Stepwell|Agrasen ki Baoli'),
  P('Rural Market','rural','market','market','Pushkar Camel Fair|Otavalo Market|Kashgar Sunday Market'),
  P('Country Estate','rural','estate','gov','Biltmore Estate|Chatsworth House|Villa La Rotonda|Château de Chenonceau'),
  P('Monastery','rural','monastery','historic','Meteora|Paro Taktsang|Mont Saint-Michel|Rila Monastery'),
  P('Grain Silos','rural','silo','rural','DeBruce Grain Elevator|Saskatchewan Heritage Elevators|FCI Khanna Depot|Bunge Rosario Terminal'),
  P('Dam','rural','dam','rural','Hoover Dam|Three Gorges Dam|Bhakra Nangal Dam|Aswan High Dam|Itaipu Dam'),
  P('Mountain Pass','alpine','pass','military','Khardung La|Stelvio Pass|Brenner Pass|Khyber Pass|Gotthard Pass'),
  P('Village Green','rural','green','house','Finchingfield Green|Grasmere Village Green|Shirakawa-go Square|Zaanse Schans Commons'),
  P('Windmills','rural','windmill','rural','Kinderdijk Windmills|Consuegra Windmills|Zaanse Schans Windmills|Kato Mili Mykonos'),

  // ───────── NATURAL TERRAIN ─────────
  P('Mountain','alpine','mountain','nature','Mount Everest|K2|Mont Blanc|Denali|Matterhorn|Kilimanjaro|Mount Fuji'),
  P('Canyon','canyon','canyon','nature','Grand Canyon|Fish River Canyon|Copper Canyon|Yarlung Tsangpo Canyon|Gorges du Verdon'),
  P('Plateau','canyon','plateau','nature','Tibetan Plateau|Colorado Plateau|Table Mountain|Mount Roraima'),
  P('Desert','desert','desert','nature','Sahara Erg Chebbi|Atacama Desert|Namib Sossusvlei|Gobi Desert|Lençóis Maranhenses'),
  P('Volcano','volcanic','volcano','nature','Mauna Loa & Kilauea|Mount Vesuvius|Yellowstone Caldera|Santorini Caldera|Mount Etna'),
  P('Karst','karst','karst','nature','Guilin Karst Towers|Ha Long Bay|Great Blue Hole|Chocolate Hills|Son Doong Cave'),
  P('Glacier','alpine','glacier','nature','Lambert Glacier|Perito Moreno Glacier|Vatnajökull|Siachen Glacier|Aletsch Glacier'),
  P('River Delta','lakes','delta','nature','Sundarbans|Nile Delta|Mississippi Delta|Okavango Delta|Amazon Estuary'),
  P('Coastal Cliffs','coast','cliff','nature','Cliffs of Moher|White Cliffs of Dover|Twelve Apostles|Étretat Arches|Na Pali Coast'),
  P('Fjord','coast','fjord','nature','Milford Sound|Geirangerfjord|Sognefjord|Ilulissat Icefjord|Bay of Kotor'),
  P('Salt Flat','saltflat','saltflat','nature','Salar de Uyuni|Rann of Kutch|Bonneville Salt Flats|Salar de Atacama'),

  // ───────── WATER ─────────
  P('Waterfall','canyon','waterfall','nature','Angel Falls|Victoria Falls|Iguazu Falls|Niagara Falls|Plitvice Waterfalls'),
  P('Lake','lakes','lake','nature','Lake Baikal|Lake Superior|Lake Titicaca|Crater Lake|Pangong Tso|Lake Como'),
  P('Coral Reef','reef','reef','nature','Great Barrier Reef|Belize Barrier Reef|Maldivian Atolls|Raja Ampat|Bikini Atoll'),
  P('Geyser Field','volcanic','geyser','nature','Old Faithful|Strokkur & Geysir|El Tatio Geysers|Pamukkale|Blue Lagoon'),
  P('Underground River','karst','cenote','nature','Puerto Princesa Underground River|Cenote Ik Kil|Sac Actun & Dos Ojos'),
  P('Strait','reef','strait','nature','Strait of Gibraltar|Strait of Malacca|Bosporus|Bering Strait|English Channel'),
  P('Lagoon','lakes','lagoon','nature','Venetian Lagoon|Chilika Lake|Kerala Backwaters|Gippsland Lakes'),
  P('Glacial Lake','alpine','subglacial','nature','Lake Vostok|Jökulsárlón|Imja Tsho|Tasman Glacier Lake'),
  P('Salt Lake','saltflat','saltlake','nature','Dead Sea|Great Salt Lake|Lake Retba|Lake Natron'),
];

// Data ini SENGAJA disamain persis sama yang ada di gamemode (biar nama yang
// tampil di website sama kayak di game). Kalau nanti lu nambah/ubah job atau
// faction di GM (systems_native.pwn), update juga array di bawah ini.

// Sumber: SERVER/systems/systems_native.pwn -> JOBName[17][]
const JOB_NAMES = [
  'Pengangguran',
  'Supir Bus',
  'Penambang',
  'Tukang Kayu',
  'Tukang Ayam',
  'Tukang Jahit',
  'Tukang Minyak',
  'Nelayan',
  'Pemerah Susu',
  'Petani',
  'Kargo',
  'Recycler',
  'Driver Mixers',
  'Porter',
  'Trucker Crate',
  'Sawit Jobs',
  '-',
];

// Sumber: SERVER/systems/systems_native.pwn -> FactName[8][]
const FACTION_NAMES = [
  'Warga',
  'Kepolisian',
  'Pemerintah',
  'EMS Kota',
  'Transportasi',
  'Bengkel',
  'Pedagang',
  'Tentara',
];

function jobName(id) {
  return JOB_NAMES[id] ?? `Job #${id}`;
}

function factionName(id) {
  return FACTION_NAMES[id] ?? `Faction #${id}`;
}

// Sumber: commands/cmds_admin.pwn -> AdminName[8][]. Index 0 ("Admin Magang")
// SENGAJA tidak dihitung sebagai staff aktif di website (atas permintaan
// owner) — daftar Staff & label jabatan cuma tampil mulai dari index 1
// ("Trial Admin") ke atas.
const ADMIN_NAMES = [
  'Admin Magang',
  'Trial Admin',
  'Helper',
  'Junior Admin',
  'Senior Admin',
  'High Admin',
  'Managament',
  'Founder',
];

function adminName(level) {
  return ADMIN_NAMES[level] ?? `Admin Lv.${level}`;
}

// Nama model kendaraan standar GTA San Andreas (ID 400-611). Ini cuma daftar
// nama, bukan aset/gambar game — aman dipakai buat label di UI.
const VEHICLE_NAMES = {
  400: 'Landstalker', 401: 'Bravura', 402: 'Buffalo', 403: 'Linerunner', 404: 'Peren',
  405: 'Sentinel', 406: 'Dumper', 407: 'Firetruck', 408: 'Trashmaster', 409: 'Stretch',
  410: 'Manana', 411: 'Infernus', 412: 'Voodoo', 413: 'Pony', 414: 'Mule',
  415: 'Cheetah', 416: 'Ambulance', 417: 'Leviathan', 418: 'Moonbeam', 419: 'Esperanto',
  420: 'Taxi', 421: 'Washington', 422: 'Bobcat', 423: 'Mr Whoopee', 424: 'BF Injection',
  425: 'Hunter', 426: 'Premier', 427: 'Enforcer', 428: 'Securicar', 429: 'Banshee',
  430: 'Predator', 431: 'Bus', 432: 'Rhino', 433: 'Barracks', 434: 'Hotknife',
  435: 'Trailer 1', 436: 'Previon', 437: 'Coach', 438: 'Cabbie', 439: 'Stallion',
  440: 'Rumpo', 441: 'RC Bandit', 442: 'Romero', 443: 'Packer', 444: 'Monster',
  445: 'Admiral', 446: 'Squalo', 447: 'Seasparrow', 448: 'Pizzaboy', 449: 'Tram',
  450: 'Trailer 2', 451: 'Turismo', 452: 'Speeder', 453: 'Reefer', 454: 'Tropic',
  455: 'Flatbed', 456: 'Yankee', 457: 'Caddy', 458: 'Solair', 459: 'Berkley RC Van',
  460: 'Skimmer', 461: 'PCJ-600', 462: 'Faggio', 463: 'Freeway', 464: 'RC Baron',
  465: 'RC Raider', 466: 'Glendale', 467: 'Oceanic', 468: 'Sanchez', 469: 'Sparrow',
  470: 'Patriot', 471: 'Quad', 472: 'Coastguard', 473: 'Dinghy', 474: 'Hermes',
  475: 'Sabre', 476: 'Rustler', 477: 'ZR-350', 478: 'Walton', 479: 'Regina',
  480: 'Comet', 481: 'BMX', 482: 'Burrito', 483: 'Camper', 484: 'Marquis',
  485: 'Baggage', 486: 'Dozer', 487: 'Maverick', 488: 'News Chopper', 489: 'Rancher',
  490: 'FBI Rancher', 491: 'Virgo', 492: 'Greenwood', 493: 'Jetmax', 494: 'Hotring Racer',
  495: 'Sandking', 496: 'Blista Compact', 497: 'Police Maverick', 498: 'Boxville', 499: 'Benson',
  500: 'Mesa', 501: 'RC Goblin', 502: 'Hotring Racer A', 503: 'Hotring Racer B', 504: 'Bloodring Banger',
  505: 'Rancher Lure', 506: 'Super GT', 507: 'Elegant', 508: 'Journey', 509: 'Bike',
  510: 'Mountain Bike', 511: 'Beagle', 512: 'Cropdust', 513: 'Stunt Plane', 514: 'Tanker',
  515: 'Roadtrain', 516: 'Nebula', 517: 'Majestic', 518: 'Buccaneer', 519: 'Shamal',
  520: 'Hydra', 521: 'FCR-900', 522: 'NRG-500', 523: 'HPV1000', 524: 'Cement Truck',
  525: 'Towtruck', 526: 'Fortune', 527: 'Cadrona', 528: 'FBI Truck', 529: 'Willard',
  530: 'Forklift', 531: 'Tractor', 532: 'Combine', 533: 'Feltzer', 534: 'Remington',
  535: 'Slamvan', 536: 'Blade', 537: 'Freight', 538: 'Streak', 539: 'Vortex',
  540: 'Vincent', 541: 'Bullet', 542: 'Clover', 543: 'Sadler', 544: 'Firetruck LA',
  545: 'Hustler', 546: 'Intruder', 547: 'Primo', 548: 'Cargobob', 549: 'Tampa',
  550: 'Sunrise', 551: 'Merit', 552: 'Utility Van', 553: 'Nevada', 554: 'Yosemite',
  555: 'Windsor', 556: 'Monster A', 557: 'Monster B', 558: 'Uranus', 559: 'Jester',
  560: 'Sultan', 561: 'Stafford', 562: 'Stratum', 563: 'Elegy', 564: 'Raindance',
  565: 'RC Tiger', 566: 'Flash', 567: 'Tahoma', 568: 'Savanna', 569: 'Bandito',
  570: 'Freight Flat', 571: 'Streak Trailer', 572: 'Kart', 573: 'Mower', 574: 'Duneride',
  575: 'Sweeper', 576: 'Broadway', 577: 'Tornado', 578: 'AT-400', 579: 'DFT-30',
  580: 'Huntley', 581: 'Stafford2', 582: 'Blista 2', 583: 'Benson2', 584: 'Mower2',
  585: 'Sadler2', 586: 'Elegant2', 587: 'Windsor2', 588: 'Cropdust2', 589: 'Stunt Plane2',
  590: 'Tanker2', 591: 'Roadtrain2', 592: 'Nebula2', 593: 'Majestic2', 594: 'Buccaneer2',
  595: 'Shamal2', 596: 'Hydra2', 597: 'FCR-9002', 598: 'NRG-5002', 599: 'HPV10002',
  600: 'Vortex2', 601: 'Vincent2', 602: 'Bullet2', 603: 'Clover2', 604: 'Sadler3',
  605: 'Fire Truck LA2', 606: 'Hustler2', 607: 'Intruder2', 608: 'Primo2', 609: 'Cargobob2',
  610: 'Tampa2', 611: 'Sunrise2',
};

function vehicleName(modelId) {
  return VEHICLE_NAMES[modelId] || `Kendaraan #${modelId}`;
}

module.exports = { jobName, factionName, vehicleName, adminName };

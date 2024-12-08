let currentSeed = null; // Global variable to store the seed
let gStars = null;

function seedRandom(seed) {
    currentSeed = seed; // Store the seed in the global variable
    let state = seed % 2147483647; // Use a large prime number
    if (state <= 0) state += 2147483646; // Ensure seed is positive

    return function () {
        state = (state * 16807) % 2147483647; // LCG: (a * x) % m
        return (state - 1) / 2147483646;      // Scale to range [0, 1)
    };
}

function parseSeedFromParam(param) {
    if (!param) return null;

    // Extract and parse seed from "B-0741-136-Priabiar" format
    const match = param.match(/[A-D]-(\d+)-(\d+)-/);
    if (!match) return null;

    const part1 = parseInt(match[1], 10);
    const part2 = parseInt(match[2], 10);
    if (isNaN(part1) || isNaN(part2)) return null;

    return part1 * 1000 + part2; // Calculate seed
}

function getSeedFromURL() {
    const url = new URL(window.location.href);
    const params = new URLSearchParams(url.search);
    const qParam = params.get('q');
    return parseSeedFromParam(qParam);
}

function setupSeededRandom() {
    const originalRandom = Math.random; // Keep a reference to the original Math.random

    let seed = getSeedFromURL();
    if (!seed) {
        seed = Math.floor(originalRandom() * 10000000); // Generate a fallback seed
    }

    Math.random = seedRandom(seed);
}

// Initialize seeded random
setupSeededRandom();

// Function to generate a random number within a range
function rollDice(sides, count = 1) {
    let total = 0;
    for (let i = 0; i < count; i++) {
        total += Math.floor(Math.random() * sides) + 1;
    }
    return total;
}

// Function to generate a random code for a sector
function generateSectorCode() {
    const quadrant = String.fromCharCode(65 + Math.floor(Math.random() * 4)); // A, B, C, D
    // const sector = String(rollDice(10000) - 1).padStart(4, '0'); // 0 to 9999
    // const subSector = String(rollDice(1000) - 1).padStart(3, '0'); // 0 to 999
    const sector = String(Math.floor(currentSeed / 1000)).padStart(4,'0');
    const subSector = String(currentSeed % 1000).padStart(3, '0');
    const subSectorName = generateName(markovChain); // Generate the subsector name using the Name Generator
    return `${quadrant}-${sector}-${subSector}-${subSectorName}`;
}

function getDistanceReport(sourceId, links) {

    // Filter links for the given source ID
    const filteredLinks = links.filter(link => link.source.id === sourceId);

    // Generate distance report for the filtered links
    const report = filteredLinks.map(link => {
        const source = link.source;
        const target = link.target;

        const distance = Math.sqrt(
            Math.pow(target.x - source.x, 2) + Math.pow(target.y - source.y, 2)
        );
        return `${distance.toFixed(2)} ly to "${target.id}"`;
    });

    return `Gates: ${report.join(', ')}`;
}

function createOutput(stars, links) {
    let output = '';
    const url = new URL(window.location.href);
    const sectorCode = generateSectorCode();
    const link = `/?q=${sectorCode}`;
    const numberOfStars = stars.length;
    output += `Sub-Sector: ${sectorCode}\nNumber of Stars: ${numberOfStars}\n\n`;
    for (let i = 0; i < numberOfStars; i++) {
        const distanceReport = getDistanceReport(stars[i].name, links);
        output += `Star ${i+1} "${stars[i].name}"\n`
        output += `${distanceReport}\n`;
        output += `${stars[i].systemOutput}\n`;
    }
    document.getElementById('sub-sector-title').innerHTML = `Plerion Sub-Sector <a href="${link}">${sectorCode}</a>`
    document.getElementById('output').textContent = output;
    document.getElementsByClassName('button-container')[0].style.visibility = "visible";
}
// Function to generate a sub-sector and prepare data for visualization
function generateSubSector() {
    const numberOfStars = rollDice(20, 2); // Step 1: Roll 2d20 to determine the number of stars
    let stars = [];

    for (let i = 0; i < numberOfStars; i++) {
        const starName = generateName(markovChain); // Generate the star name
        let starSystem = generateSystem(starName); // Pass the star name to generateSystem()
        stars.push({ name: starName, distance: [], systemOutput: starSystem.systemOutput, spectralType: starSystem.spectralType });
    }
    gStars = stars;
    // Prepare nodes and links for visualization
    visualizeSubSector(stars, createOutput); // Call visualization function with nodes and links data
}

// Function to generate a system for a given star name
function generateSystem(starName) {
    let systemOutput = '';
    const numberOfStarsInSystem = rollDice(20);
    systemOutput += `Number of Stars in System: ${determineStarCount(numberOfStarsInSystem)}\n`;

    const spectralType = determineSpectralType(rollDice(20));
    systemOutput += `Spectral Type: ${spectralType}\n`;

    // Roll for the number of space habitats
    const numberOfHabitats = rollDice(6)-1; // Step 4: Roll 1d6 for space habitats
    systemOutput += `Number of Space Habitats: ${numberOfHabitats}\n`;
    if (numberOfHabitats === 0) {
        systemOutput += "Dead System: No planets in this system.\n";
    }
    else {
        // Determine the type of each space habitat
        for (let i = 0; i < numberOfHabitats; i++) {
            const habitatType = determineSpaceHabitatType(rollDice(20));
            systemOutput += `Space Habitat ${i + 1}: ${habitatType}\n`;
        }

        let numberOfPlanets;

        numberOfPlanets = rollDice(6) + 4; // Step 3: Roll 1d6+4 to determine planets
        systemOutput += `Number of Planets: ${numberOfPlanets}\n`;

        const habitableWorlds = rollDice(6) / 2 | 0; // Roll 1d3 for habitable zone worlds

        for (let i = 0; i < numberOfPlanets; i++) {
            const planetName = `${starName}-${i + 1}`; // Name the planet based on the star name and its position
            const planetType = determinePlanetType(rollDice(20), i < habitableWorlds); // Determine if the planet is habitable
            let planetDetails = `  Planet ${i + 1} (${planetName}): ${planetType}`;
            
            // Determine features for the planet regardless of its type
            const planetFeatures = determinePlanetFeatures(rollDice(20));
            planetDetails += `, Features: ${planetFeatures}`;
            
            // Roll for additional details (government, economy, etc.) for all planets
            const government = determineGovernment();
            const economy = determineEconomy();
            const gdpLevel = determineGDPLevel();
            let techLevel = determineTechnologicalLevel();

            // If the planet is habitable, roll for population and assign an additional random name
            let population = 'Uninhabited';
            if (planetType.includes("(H)")) {
                population = determinePopulation();
                if (population !== 'Uninhabited') {
                    const habitablePlanetName = generateName(markovChain); // Assign a randomly generated name
                    planetDetails += `\n    Name: ${habitablePlanetName}`;
                }
            } else {
                // If the planet is not habitable, restrict tech level to Stellar Age or Interstellar Age
                if (techLevel !== 'Stellar Age' && techLevel !== 'Interstellar Age') {
                    techLevel = rollDice(20) <= 13 ? 'Stellar Age' : 'Interstellar Age';
                }

                // If the planet is inhospitable but has population, determine colony type
                population = determinePopulation();
                if (population !== 'Uninhabited') {
                    const colonyType = determineColonyType();
                    planetDetails += `\n    Colony: ${colonyType}`;
                }
            }

            planetDetails += `\n    Government: ${government}`;
            planetDetails += `\n    Economy: ${economy}`;
            planetDetails += `\n    GDP Level: ${gdpLevel}`;
            planetDetails += `\n    Tech Level: ${techLevel}`;
            planetDetails += `\n    Population: ${population}`;

            // Determine moons for the planet
            planetDetails += determineMoons(planetName);

            // Determine space stations for the planet
            const spaceStations = determineSpaceStations();
            planetDetails += spaceStations;

            systemOutput += `${planetDetails}\n`;
        }
    }

    return {
        systemOutput, 
        spectralType // Return spectral type for visualization purposes
    };
}


function determineStarCount(roll) {
    if (roll <= 3) return 'Single';
    if (roll <= 18) return 'Binary';
    if (roll === 19) return 'Trinary';
    return `Multiple (${rollDice(6) + 1})`;
}

function determineSpectralType(roll) {
    if (roll <= 15) return 'M (Red-Orange)';
    if (roll <= 17) return 'K (Orange)';
    if (roll === 18) return 'F/G (Yellow)';
    if (roll === 19) return 'A (White)';
    if (roll === 20) {
        // Roll on the second table
        return `Special (${determineSpecialSpectralType(rollDice(20))})`;
    }
}

function determineSpecialSpectralType(roll) {
    if (roll <= 14) return 'T (Brown Dwarf)';
    if (roll === 15) return 'M (Red Giant)';
    if (roll === 16) return 'B (Blue Giant)';
    if (roll === 17 || roll === 18) return 'Black Hole';
    if (roll === 19 || roll === 20) return 'Neutron Star';
}

function determinePlanetType(roll, isHabitableZone) {
    let planetType;
    if (roll <= 5) planetType = 'Gas Giant';
    else if (roll <= 10) planetType = 'Ice Giant';
    else if (roll <= 17) planetType = 'Terrestrial';
    else if (roll <= 19) planetType = 'Dwarf';
    else planetType = 'Asteroid Belt';

    // If it's in the habitable zone, add (H)
    if (isHabitableZone && planetType === 'Terrestrial') {
        planetType += ' (H)';
    }

    return planetType;
}

function determinePlanetFeatures(roll) {
    const features = [
        "Barren", "Frozen", "Arid", "Desert", "Tidally Locked",
        "Savanna", "Arctic", "Steppe", "Continental", "Relic",
        "Forest", "Archipelago", "Waterworld", "Tropical", "Hothouse",
        "Ecumenopolis", "Garden World", "Hellworld", "Tainted", "Ruined"
    ];
    return features[roll - 1];
}

function determineSpaceHabitatType(roll) {
    if (roll <= 6) return "Asteroid Colony";
    if (roll <= 8) return "O'Neil Cylinder";
    if (roll <= 10) return "McKendree Cylinder";
    if (roll <= 13) return "Stanford Torus";
    if (roll <= 15) return "Bernal Sphere";
    if (roll <= 18) return "Bishop Ring";
    if (roll <= 20) return "Banks Orbital";
}

function determineGovernment() {
    const roll = rollDice(20);
    if (roll <= 2) return "Corporate";
    if (roll <= 4) return "Democracy";
    if (roll <= 6) return "Oligarchy";
    if (roll <= 8) return "Dictatorship";
    if (roll <= 10) return "Feudal";
    if (roll <= 12) return "Anarchy";
    if (roll <= 14) return "Technocracy";
    if (roll <= 16) return "Autocracy";
    if (roll <= 18) return "Bureaucracy";
    return "Theocracy";
}

function determineEconomy() {
    const roll = rollDice(20);
    if (roll <= 6) return "Agricultural";
    if (roll <= 11) return "Industrial";
    if (roll <= 14) return "Finance";
    if (roll <= 16) return "Mining";
    if (roll <= 19) return "Political Center";
    return "Religious Center";
}

function determineGDPLevel() {
    const roll = rollDice(20);
    if (roll <= 4) return "Poor";
    if (roll <= 8) return "Low";
    if (roll <= 12) return "Average";
    if (roll <= 16) return "Good";
    if (roll <= 19) return "High";
    return "Rich";
}

function determineTechnologicalLevel() {
    const roll = rollDice(20);
    if (roll === 1) return "Stone Age";
    if (roll === 2) return "Metal Age";
    if (roll === 3) return "Clock Age";
    if (roll === 4) return "Steam Age";
    if (roll === 5) return "Machine Age";
    if (roll <= 7) return "Atomic Age";
    if (roll <= 9) return "Information Age";
    if (roll <= 11) return "Space Age";
    if (roll <= 13) return "Stellar Age";
    return "Interstellar Age";
}

function determinePopulation() {
    const roll = rollDice(20);
    if (roll >= 19) return "Uninhabited"; // Handle uninhabited case
    const popRoll = rollDice(20);
    if (popRoll <= 2) return "10+";
    if (popRoll <= 4) return "100+";
    if (popRoll <= 6) return "1,000+";
    if (popRoll <= 8) return "10k+";
    if (popRoll <= 10) return "100k+";
    if (popRoll <= 12) return "1mln+";
    if (popRoll <= 14) return "10mln+";
    if (popRoll <= 16) return "100mln+";
    if (popRoll <= 18) return "1bln+";
    return "10bln+";
}

// Moon generation logic based on planet type
function determineMoons(planetType) {
    let moonDetails = '';
    let numberOfMoons = 0;

    if (planetType.startsWith('Gas Giant') || planetType.startsWith('Ice Giant')) {
        numberOfMoons = rollDice(20); // Roll 1d20 for the number of moons
    } else if (planetType.startsWith('Terrestrial')) {
        numberOfMoons = rollDice(6) / 2 | 0; // Roll 1d3 for the number of moons
    } else if (planetType.startsWith('Dwarf')) {
        if (rollDice(6) === 6) {
            numberOfMoons = 1; // Roll 1d6, if 6, it has 1 moon
        }
    } else if (planetType.startsWith('Asteroid Belt') || planetType.startsWith('Space Habitat')) {
        return ''; // No moons for asteroid belts or space habitats
    }

    if (numberOfMoons > 0) {
        moonDetails += `\n    Moons: ${numberOfMoons}`;
        for (let j = 0; j < numberOfMoons; j++) {
            const moonType = determineMoonType(rollDice(20));
            const moonPopulation = determinePopulation(true); // Roll for moon population, capped at 10mln

            moonDetails += `\n      Moon ${j + 1}: ${moonType}, Population: ${moonPopulation}`;
        }
    } else {
        moonDetails += `\n    Moons: None`;
    }

    return moonDetails;
}

// Determine moon size and type, and invoke determineMoonFeatures() for planetary-mass moons
function determineMoonType(roll) {
    if (roll <= 10) {
        const moonFeatures = determineMoonFeatures("Planetary-mass");
        return `Planetary-mass, Features: ${moonFeatures}`;
    }
    if (roll <= 14) return "Small Rock";
    if (roll <= 18) return "Big Rock";
    return "Ring";
}

// Determine moon features based on type
function determineMoonFeatures(moonType) {
    if (moonType === "Ring") return "None (Ring)";
    
    const roll = rollDice(20);
    if (roll <= 15) return "Barren";
    if (roll <= 17) return "Frozen";
    if (roll === 18) return "Vulcanic";
    if (roll === 19) return "Hothouse";
    return "Habitable";
}

// Determine colony type for inhospitable planets with population
function determineColonyType() {
    const roll = rollDice(20);
    if (roll <= 4) return "Arcology";
    if (roll <= 8) return "Modular Ground Installation";
    if (roll <= 12) return "Floating Citadel";
    if (roll <= 16) return "Domed City";
    return "Underground Base";
}

// Determine space stations for a planet
function determineSpaceStations() {
    const numberOfStations = rollDice(20); // Roll 1d20 to determine how many stations
    if (numberOfStations === 0) return ''; // If no stations, return nothing

    let stationDetails = `\n    Space Stations: ${numberOfStations}`;
    for (let i = 0; i < numberOfStations; i++) {
        const stationType = determineStationType();
        const stationFunction = determineStationFunction();
        stationDetails += `\n      Station ${i + 1}: ${stationType}, Function: ${stationFunction}`;
    }

    return stationDetails;
}

// Determine space station type
function determineStationType() {
    const roll = rollDice(20);
    if (roll <= 4) return "Wheeled Station";
    if (roll <= 8) return "Zero-G Station";
    if (roll <= 12) return "Void Citadel";
    if (roll <= 16) return "Domed Installation";
    return "Underground Facility";
}

// Determine space station function
function determineStationFunction() {
    const roll = rollDice(20);
    if (roll <= 2) return "Science Lab";
    if (roll <= 4) return "Astronomic Observatory";
    if (roll <= 6) return "Military Base";
    if (roll <= 8) return "Weapon Factory";
    if (roll <= 10) return "Electronics Factory";
    if (roll <= 12) return "Chemicals Factory";
    if (roll <= 14) return "Mining Station";
    if (roll <= 16) return "Solar Power Plant";
    if (roll <= 18) return "Farm";
    return "Idroponics";
}

///// Name Generator

// Function to create the Markov Chain model without allowing 'null' transitions
function buildMarkovChain(names) {
    const chain = {};

    // Loop over all names
    names.forEach(name => {
        for (let i = 0; i < name.length; i++) {
            const char = name[i];
            const nextChar = name[i + 1] || null;
            
            // Initialize the chain entry for this character
            if (!chain[char]) {
                chain[char] = {};
            }

            // Only count transitions to actual characters, avoid 'null' transitions
            if (nextChar) {
                if (!chain[char][nextChar]) {
                    chain[char][nextChar] = 0;
                }
                chain[char][nextChar]++;
            }
        }
    });

    // Convert counts to probabilities
    for (const char in chain) {
        const total = Object.values(chain[char]).reduce((sum, count) => sum + count, 0);
        for (const nextChar in chain[char]) {
            chain[char][nextChar] /= total;
        }
    }

    return chain;
}

// Function to generate a new name using the Markov Chain, ensuring the first letter is uppercase
function generateName(chain, maxLength = 8) {
    const name = [];
    
    // Ensure the first character is always uppercase
    let currentChar = getRandomChar(Object.keys(chain).filter(c => c === c.toUpperCase()));

    // Generate the name until the max length is reached
    while (currentChar && name.length < maxLength) {
        name.push(currentChar);
        currentChar = getNextChar(chain[currentChar]);

        // Stop if the next character does not exist (end of possible transitions)
        if (!currentChar) {
            break;
        }
    }

    return name.join('');
}


// Helper function to randomly select a character from a set of probabilities
function getNextChar(charProbabilities) {
    const rand = Math.random();
    let cumulative = 0;

    for (const char in charProbabilities) {
        cumulative += charProbabilities[char];
        if (rand < cumulative) {
            return char;
        }
    }

    return null; // No next character available, signal the end of the name
}

// Helper function to randomly select an initial character
function getRandomChar(chars) {
    return chars[Math.floor(Math.random() * chars.length)];
}

// Tables of names from the provided lists
const names = [
"Altan", "Acrabih", "Chedar", "Asterops", "Porrimacent", "Rukbatena", "Nihalleth", "Arcturud", "Sheleb", "Porrim", "Eltais", "Sadalm", "Muliph", "Arnephoros", "Nihaldus", "Casterionea", "Menchibah", "Shamarkab", "Dabit", "Zubenelaeno", "Alnitaka", "Asella", "Nihallatria", "Chernar", "Zelfafage", "Alchir", "Alcherakis", "Algiennah", "Menchiba", "Phecca", "Neschabi", "Pleionea", "Thaldib", "Zanin", "Mirfar", "Sadachium", "Ashleshat", "Capellum", "Leshat", "Zubeneshmet", "Minchira", "Alchird", "Ashlesari", "Algediadem", "Procyone", "Chelectra", "Ankalhai", "Chera", "Sarthim", "Atrix", "Asellux", "Hadalmacent", "Alnathfar", "Aldhard", "Denescha", "Sadirachir", "Vindemin", "Homali", "Furus", "Algor", "Fomam", "Alkali", "Arrai", "Aladfarkad", "Aldeba", "Maham", "Hasich", "Phernar", "Acrabit", "Alphara", "Cellum", "Zubens", "Pollus", "Alpherrakis", "Alpherami", "Gorgone", "Shelik", "Proxima", "Almelik", "Cella", "Shail", "Suhain", "Alatria", "Zibah", "Angeta", "Castabi", "Alrak", "Krazet", "Sarga", "Astaban", "Rastra", "Kocha", "Homalhaula", "Alcyon", "Yildus", "Theemiatria", "Prope", "Alram", "Almachir", "Alnath", "Denelaeno", "Menkaa", "Denelgubi", "Phard", "Alsuud", "Celava", "Mesath", "Saipheratz", "Matares", "Bahasich", "Alpha", "Cynosurah", "Alhaut", "Gomeisam", "Zubenebola", "Suhelik", "Zedar", "Ascelaeno", "Aldhaferatz", "Grasat", "Wasalmach", "Dschara", "Kochard", "Alsha", "Salmeliak", "Acamarkad", "Almacentak", "Grassa", "Grafi", "Mahamak", "Ashleshmet", "Sadalshat", "Kastulafat", "Dhenar", "Wasalarazet", "Rotan", "Castulafage", "Gatrix", "Astor", "Scelava", "Aldun", "Celbarich", "Zauri", "Lesat", "Deneshmet", "Zubenetnash", "Errim", "Ruchbia", "Procyonea", "Sadalmeliak", "Achiba", "Sadaron", "Sadar", "Alphein", "Kitak", "Zaurakis", "Alkura", "Navior", "Phein", "Capellux", "Pollum", "Alamulk", "Sherkad", "Acubeneb", "Bella", "Sadir", "Pleion", "Menkentakan", "Elmuthal", "Diphernar", "Regorab", "Algiebara", "Sterione", "Adhaferak", "Errimachium", "Alshaula", "Bellatria", "Aldhib", "Alsham", "Bellath", "Hezen", "Mergas", "Chedaron", "Acamali", "Brach", "Miracheat", "Minchium", "Muliphda", "Algorgone", "Betelgedi", "Unukat", "Seginusakan", "Zelfafat", "Antauri", "Almachedar", "Denetnash", "Nihaldib", "Aladfarkar", "Bellum", "Asterf", "Matan", "Acamalhenar", "Elmuthabih", "Wasathfar", "Miatrix", "Ksorab", "Saleh", "Alphah", "Asellah", "Astula", "Aldah", "Algiedi", "Diademinkaa", "Hassias", "Hadira", "Cherkab"
];

// Build the Markov Chain and generate new names
const markovChain = buildMarkovChain(names);

const spectralColors = {
    "M": "#ff4500",  // Red-Orange
    "K": "#ff8c00",  // Orange
    "F/G": "#ffd700",  // Yellow
    "A": "#ffffff",  // White
    "Special": "#a020f0"  // Purple or other for special types
};

// Visualization function with D3.js
function visualizeSubSector(stars, callback) {
    const width = window.innerWidth - 30; // Dynamically get window width
    const height = window.innerHeight - 60; // Dynamically get window height
    const buffer = 30; // Buffer space around the edges of the SVG
    const spectralColors = {
        "M (Red-Orange)": "#ff4500",  // Red-Orange
        "K (Orange)": "#ff8c00",  // Orange
        "F/G (Yellow)": "#ffd700",  // Yellow
        "A (White)": "#ffffff",  // White
        "Special": "#a020f0"  // Purple or other for special types
    };
   const nodes = stars.map(star => ({ id: star.name, spectralType: star.spectralType }));
    // Ensure each node has 1 to 3 connections with random other nodes
    links = generateRandomLinks(nodes, 1, 3);
    // Clear the previous visualization if it exists
    d3.select("#visualization").selectAll("*").remove();

    // Create an SVG element
    const svg = d3.select("#visualization")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    // Create a simulation with force-directed layout
    const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.id).strength(0.1))
        .force("charge", d3.forceManyBody().strength(-700))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("x", d3.forceX(width / 2).strength(0.012))
        .force("y", d3.forceY(height / 2).strength(0.012))
        .force("collide", d3.forceCollide(50));
        
    // Add lines for the links between nodes
    const link = svg.append("g")
        .attr("stroke", "#999")
        .attr("stroke-opacity", 0.6)
        .selectAll("line")
        .data(links)
        .enter().append("line")
        .attr("stroke-width", 2);

    // Add circles for the nodes, coloring by spectral type
    const node = svg.append("g")
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.5)
        .selectAll("circle")
        .data(nodes)
        .enter().append("circle")
        .attr("r", 10)
        .attr("fill", d => spectralColors[d.spectralType] || "#69b3a2") // Use spectral type for color
        .call(drag(simulation));

    // Add labels to the nodes
    const label = svg.append("g")
        .selectAll("text")
        .data(nodes)
        .enter().append("text")
        .attr("dy", -15)
        .attr("dx", -10)
        .text(d => d.id);

    // Update the simulation on each tick
    simulation.on("tick", () => {
        link
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

            node
            .attr("cx", d => (d.x = Math.max(buffer, Math.min(width - buffer, d.x)))) // Constrain x with buffer
            .attr("cy", d => (d.y = Math.max(buffer, Math.min(height - buffer, d.y)))); // Constrain y with buffer
    
        label
            .attr("x", d => d.x)
            .attr("y", d => d.y);
    });

    simulation.on("end", () => {
        callback(stars, links);
    });

    // Dragging functionality for nodes
    function drag(simulation) {
        function dragstarted(event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }

        function dragged(event, d) {
            d.fx = event.x;
            d.fy = event.y;
        }

        function dragended(event, d) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }

        return d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended);
    }

    // Function to generate random links ensuring 1-3 connections per node
    function generateRandomLinks(nodes, minConnections, maxConnections) {
        const links = [];
        nodes.forEach((source, index) => {
            const connectionCount = Math.floor(Math.random() * (maxConnections - minConnections + 1)) + minConnections;
            const targets = [...nodes];
            targets.splice(index, 1); // Remove self from potential targets
            for (let i = 0; i < connectionCount; i++) {
                if (targets.length === 0) break;
                const randomIndex = Math.floor(Math.random() * targets.length);
                const target = targets.splice(randomIndex, 1)[0]; // Ensure unique connection
                links.push({ source: source.id, target: target.id });
            }
        });
        return links;
    }
}


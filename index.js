// Array of user IDs to fetch data for
const user_ids = [
    '64c957b885d4aac49663c2eb', // acid1g
    '62fb76642f946dc1acae5f6e', // uni1g
    '60cb6c6794befb7c9370a42c', // psp1g
    '61685e2aeca325871f35bee5', // deme
    '60867b015e01df61570ab900', // CupOfKathi
    '628e93a4539b08d3d9084d88'  // SHIZU
];

// Reference to the container where the elements will be appended
const container = document.getElementById('centered-container');

// Function to set up styles for text elements
function setUpElement(textElement) {
    // Currently empty, can be extended for additional element setup
}

// Function to convert ARGB color to RGBA format
function argbToRgba(color) {
    if (color < 0) {
        color = color >>> 0; // Convert negative to unsigned
    }

    const red = (color >> 24) & 0xFF;   // Extract red channel
    const green = (color >> 16) & 0xFF; // Extract green channel
    const blue = (color >> 8) & 0xFF;   // Extract blue channel
    return `rgb(${red}, ${green}, ${blue})`; // Return as RGBA string
}

// Async function to fetch paint data based on paint ID
async function getPaint(paint_id) {
    try {
        const response = await fetch('https://7tv.io/v3/gql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                operationName: 'GetCosmetics',
                variables: { list: [paint_id] },
                query: `query GetCosmetics($list: [ObjectID!]) {
                    cosmetics(list: $list) {
                        paints {
                            id
                            kind
                            name
                            function
                            color
                            angle
                            shape
                            image_url
                            repeat
                            stops {
                                at
                                color
                            }
                            shadows {
                                x_offset
                                y_offset
                                radius
                                color
                            }
                        }
                        badges {
                            id
                            kind
                            name
                            tooltip
                            tag
                        }
                    }
                }`,
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json(); // Parse JSON response
        return data; // Return the fetched data
    } catch (error) {
        console.error('Error fetching data:', error); // Log and throw error
        throw error; // Propagate the error
    }
}

// Async function to load user data and apply corresponding paint styles
async function load(user_id, textElement) {
    try {
        const response = await fetch('https://7tv.io/v3/gql', {
            method: 'POST',
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "query": "query GetUserCurrentCosmetics($id: ObjectID!) { user(id: $id) { id username display_name style { paint { id kind name } badge { id kind name } } } }",
                "variables": {
                    "id": `${user_id}`
                }
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json(); // Parse JSON response

        let changed = false; // Flag to track if style changes
        let paintInfo = {
            "backgroundImage": null, // Background image URL or gradient
            "shadow": null // CSS filter for shadows
        }

        let paint = null; // Initialize paint object

        // Check if user has a paint style defined
        if (data.data.user.style && data.data.user.style["paint"]) {
            const paintData = await getPaint(data.data.user.style["paint"].id); // Fetch paint data

            paint = paintData.data.cosmetics.paints[0]; // Extract paint details

            // Determine background image based on paint type
            if (paint.image_url) {
                paintInfo.backgroundImage = `url('${paint.image_url}')`; // Set background image URL
                changed = true; // Indicate change in style
            } else if (paint.stops.length > 0) {
                // Create gradient from paint stops
                const colors = paint.stops.map(stop => ({
                    at: stop.at,
                    color: stop.color
                }));

                const normalizedColors = colors.map((stop, index) => ({
                    at: (100 / (colors.length - 1)) * index,
                    color: stop.color
                }));

                const gradient = normalizedColors.map(stop =>
                    `${argbToRgba(stop.color)} ${stop.at}%`
                ).join(', ');

                paintInfo.backgroundImage = `linear-gradient(${paint.angle}deg, ${gradient})`; // Set gradient background
                changed = true; // Indicate change in style
            }

            textElement.textContent = `${paint.name}`; // Set text content to paint name

            // Apply shadows if defined
            if (paint.shadows) {
                const shadows = paint.shadows;
                
                // Generate CSS filter for drop shadows
                const customShadow = shadows.map(shadow => {
                    let rgbaColor = argbToRgba(shadow.color);
                    rgbaColor = rgbaColor.replace(/rgba\((\d+), (\d+), (\d+), (\d+(\.\d+)?)\)/, `rgba($1, $2, $3)`);

                    return `drop-shadow(${rgbaColor} ${shadow.x_offset}px ${shadow.y_offset}px ${shadow.radius}px)`;
                }).join(' ');

                paintInfo.shadow = customShadow; // Set shadow CSS filter
            }
        }

        // If no change detected in style, apply default gradient
        if (!changed) {
            const gradient = 'white, white';
            const angle = 45;
            paintInfo.backgroundImage = `linear-gradient(${angle}deg, ${gradient})`; // Default gradient
            textElement.textContent = `No Paint`; // Text content when no paint style
        }

        // Apply computed styles to the text element
        textElement.style.cssText = `background-image: ${paintInfo.backgroundImage}; filter: ${paintInfo.shadow};`;
    } catch (error) {
        console.error('Error fetching data:', error); // Log error fetching data
    }
}

// Loop through user_ids, create text elements, apply styles, and load data for each user
user_ids.forEach(user_id => {
    const textElement = document.createElement('div'); // Create a new 'div' element
    textElement.classList.add('paint');  // Add the class
    textElement.textContent = 'Paint';               // Set initial text content

    container.appendChild(textElement);               // Append to the container

    load(user_id, textElement);                       // Load data for the user
});

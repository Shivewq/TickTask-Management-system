const axios = require('axios');

// Function to get current time from World Clock API
async function getCurrentTime() {
  try {
    const response = await axios.get('http://worldclockapi.com/api/json/utc/now');

    // Extract the datetime from the response
    const { currentDateTime } = response.data;

    return currentDateTime;
  } catch (error) {
    console.error('Error fetching current time:', error.message);
    return null;
  }
}

module.exports = getCurrentTime

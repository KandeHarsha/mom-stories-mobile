import * as SecureStore from 'expo-secure-store';


export const fetchAccessToken = async (): Promise<string | null> => {
    try {
        const token = await SecureStore.getItemAsync('accessToken');
        return token;
    } catch (error) {
        console.error('Error fetching access token:', error);
        return null;
    }
};

export const sizeComparisionOfBabyByWeek = {
  4: "poppy seed",
  5: "sesame seed",
  6: "lentil",
  7: "blueberry",
  8: "chickpea",
  9: "grape",
  10: "kumquat",
  11: "fig",
  12: "lime",
  13: "plum",
  14: "lemon",
  15: "apple",
  16: "avocado",
  17: "onion",
  18: "sweet potato",
  19: "heirloom tomato",
  20: "mango",
  21: "carrot",
  22: "papaya",
  23: "large mango",
  24: "coconut",
  25: "rutabaga",
  26: "corn on the cob",
  27: "bottle gourd",
  28: "large eggplant",
  29: "pumpkin",
  30: "cabbage",
  31: "coconut",
  32: "pineapple",
  33: "jackfruit",
  34: "large papaya",
  35: "honeydew melon",
  36: "watermelon",
  37: "muskmelon",
  38: "large watermelon",
  39: "pumpkin",
  40: "small pumpkin"
}
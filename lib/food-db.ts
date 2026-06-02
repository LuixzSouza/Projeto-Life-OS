export interface FoodItem {
  id: string;
  name: string;
  emoji: string;
  calories: number; // por porção média
  unit: string;
  image?: string;   // URL da imagem (ex: Open Food Facts)
  brand?: string;   // marca/origem do produto
  source?: "LOCAL" | "OFF"; // banco local ou Open Food Facts
}

export const FOOD_DATABASE: FoodItem[] = [
  // Cereais, grãos e derivados
  { id: 'rice_white', name: 'Arroz Branco', emoji: '🍚', calories: 130, unit: '100g' },
  { id: 'rice_brown', name: 'Arroz Integral', emoji: '🍚', calories: 111, unit: '100g' },
  { id: 'quinoa', name: 'Quinoa Cozida', emoji: '🥣', calories: 120, unit: '100g' },
  { id: 'oats', name: 'Aveia', emoji: '🌾', calories: 120, unit: '30g' },
  { id: 'corn', name: 'Milho Cozido', emoji: '🌽', calories: 96, unit: '100g' },
  { id: 'cornflakes', name: 'Cornflakes', emoji: '🥣', calories: 110, unit: '30g' },
  { id: 'bread_white', name: 'Pão Francês', emoji: '🥖', calories: 150, unit: 'unid' },
  { id: 'bread_whole', name: 'Pão Integral', emoji: '🍞', calories: 120, unit: 'fatia' },
  { id: 'bagel', name: 'Bagel', emoji: '🥯', calories: 250, unit: 'unid' },
  { id: 'tortilla', name: 'Tortilla (trigo)', emoji: '🌮', calories: 120, unit: 'unid' },
  { id: 'pasta', name: 'Macarrão Cozido', emoji: '🍝', calories: 160, unit: '100g' },
  { id: 'spaghetti', name: 'Espaguete', emoji: '🍝', calories: 158, unit: '100g' },
  { id: 'lasagna', name: 'Lasanha (fatia)', emoji: '🍽️', calories: 320, unit: 'fatia' },
  { id: 'barley', name: 'Cevada Cozida', emoji: '🥣', calories: 123, unit: '100g' },
  { id: 'couscous', name: 'Cuscuz Marroquino', emoji: '🥣', calories: 112, unit: '100g' },
  { id: 'polenta', name: 'Polenta Cozida', emoji: '🌽', calories: 70, unit: '100g' },
  { id: 'granola_sugar_free', name: 'Granola sem açúcar', emoji: '🥣', calories: 400, unit: '100g' },

  // Tubérculos e raízes
  { id: 'potato', name: 'Batata Inglesa', emoji: '🥔', calories: 85, unit: '100g' },
  { id: 'sweet_potato', name: 'Batata Doce', emoji: '🍠', calories: 86, unit: '100g' },
  { id: 'cassava', name: 'Mandioca (Aipim)', emoji: '🌿', calories: 160, unit: '100g' },
  { id: 'yam', name: 'Inhame', emoji: '🍠', calories: 118, unit: '100g' },
  { id: 'beetroot', name: 'Beterraba Cozida', emoji: '🍠', calories: 44, unit: '100g' },
  { id: 'carrot_cooked', name: 'Cenoura Cozida', emoji: '🥕', calories: 35, unit: '100g' },

  // Leguminosas
  { id: 'beans_black', name: 'Feijão Preto', emoji: '🫘', calories: 132, unit: '100g' },
  { id: 'beans_pinto', name: 'Feijão Carioca', emoji: '🫘', calories: 76, unit: '100g' },
  { id: 'lentils', name: 'Lentilha Cozida', emoji: '🥣', calories: 116, unit: '100g' },
  { id: 'chickpeas', name: 'Grão-de-bico', emoji: '🥗', calories: 164, unit: '100g' },
  { id: 'peas', name: 'Ervilhas', emoji: '🥣', calories: 81, unit: '100g' },
  { id: 'soybeans', name: 'Soja Cozida', emoji: '🫘', calories: 173, unit: '100g' },
  { id: 'edamame', name: 'Edamame', emoji: '🫛', calories: 122, unit: '100g' },

  // Proteínas - carnes e aves
  { id: 'chicken_grilled', name: 'Frango Grelhado', emoji: '🍗', calories: 165, unit: '100g' },
  { id: 'chicken_breast', name: 'Peito de Frango Cozido', emoji: '🍗', calories: 150, unit: '100g' },
  { id: 'chicken_thigh', name: 'Sobrecoxa de Frango', emoji: '🍗', calories: 209, unit: '100g' },
  { id: 'turkey_breast', name: 'Peito de Peru', emoji: '🦃', calories: 135, unit: '100g' },
  { id: 'beef_ground', name: 'Carne Moída (magra)', emoji: '🥩', calories: 250, unit: '100g' },
  { id: 'beef_steak', name: 'Bife Grelhado', emoji: '🥩', calories: 270, unit: '100g' },
  { id: 'pork_chop', name: 'Bisteca de Porco', emoji: '🍖', calories: 242, unit: '100g' },
  { id: 'lamb_chop', name: 'Costeleta de Cordeiro', emoji: '🍖', calories: 294, unit: '100g' },
  { id: 'bacon', name: 'Bacon Frito', emoji: '🥓', calories: 541, unit: '100g' },
  { id: 'sausage_pork', name: 'Linguiça Toscana', emoji: '🌭', calories: 300, unit: '100g' },
  { id: 'ham', name: 'Presunto Cozido', emoji: '🥓', calories: 145, unit: '100g' },

  // Peixes e frutos do mar
  { id: 'salmon_grilled', name: 'Salmão Grelhado', emoji: '🐟', calories: 208, unit: '100g' },
  { id: 'tuna_fresh', name: 'Atum Fresco', emoji: '🐟', calories: 144, unit: '100g' },
  { id: 'tuna_canned_water', name: 'Atum em Lata (água)', emoji: '🐟', calories: 116, unit: '100g' },
  { id: 'shrimp_steamed', name: 'Camarão no Vapor', emoji: '🦐', calories: 99, unit: '100g' },
  { id: 'cod', name: 'Bacalhau', emoji: '🐟', calories: 82, unit: '100g' },
  { id: 'tilapia', name: 'Tilápia', emoji: '🐟', calories: 96, unit: '100g' },
  { id: 'sardine_canned', name: 'Sardinha em Lata', emoji: '🐟', calories: 208, unit: '100g' },

  // Ovos
  { id: 'egg_boiled', name: 'Ovo Cozido', emoji: '🥚', calories: 70, unit: 'unid' },
  { id: 'egg_fried', name: 'Ovo Frito', emoji: '🍳', calories: 90, unit: 'unid' },
  { id: 'omelette_cheese', name: 'Omelete com Queijo', emoji: '🍳', calories: 250, unit: 'porção' },
  { id: 'egg_whites', name: 'Claras de Ovo', emoji: '🥚', calories: 17, unit: 'unid' },

  // Laticínios e Substitutos
  { id: 'milk_whole', name: 'Leite Integral', emoji: '🥛', calories: 60, unit: '100ml' },
  { id: 'milk_skim', name: 'Leite Desnatado', emoji: '🥛', calories: 34, unit: '100ml' },
  { id: 'soy_milk', name: 'Leite de Soja', emoji: '🥛', calories: 54, unit: '100ml' },
  { id: 'almond_milk', name: 'Leite de Amêndoas', emoji: '🥛', calories: 17, unit: '100ml' },
  { id: 'yogurt_plain', name: 'Iogurte Natural', emoji: '🥛', calories: 59, unit: '100g' },
  { id: 'greek_yogurt', name: 'Iogurte Grego', emoji: '🥣', calories: 97, unit: '100g' },
  { id: 'cheese_cheddar', name: 'Queijo Cheddar', emoji: '🧀', calories: 402, unit: '100g' },
  { id: 'cheese_mozzarella', name: 'Queijo Muçarela', emoji: '🧀', calories: 280, unit: '100g' },
  { id: 'cheese_parmesan', name: 'Queijo Parmesão', emoji: '🧀', calories: 431, unit: '100g' },
  { id: 'cheese_cottage', name: 'Queijo Cottage', emoji: '🧀', calories: 98, unit: '100g' },
  { id: 'cheese_ricotta', name: 'Ricota', emoji: '🧀', calories: 174, unit: '100g' },
  { id: 'butter', name: 'Manteiga', emoji: '🧈', calories: 717, unit: '100g' },
  { id: 'cream_heavy', name: 'Creme de Leite', emoji: '🥛', calories: 340, unit: '100g' },

  // Vegetais e Legumes
  { id: 'lettuce', name: 'Alface', emoji: '🥬', calories: 15, unit: '100g' },
  { id: 'arugula', name: 'Rúcula', emoji: '🥗', calories: 25, unit: '100g' },
  { id: 'spinach_raw', name: 'Espinafre Cru', emoji: '🥬', calories: 23, unit: '100g' },
  { id: 'kale', name: 'Couve Manteiga', emoji: '🥬', calories: 49, unit: '100g' },
  { id: 'broccoli', name: 'Brócolis Cozido', emoji: '🥦', calories: 35, unit: '100g' },
  { id: 'cauliflower', name: 'Couve-flor Cozida', emoji: '🥦', calories: 25, unit: '100g' },
  { id: 'carrot_raw', name: 'Cenoura Crua', emoji: '🥕', calories: 41, unit: '100g' },
  { id: 'tomato', name: 'Tomate', emoji: '🍅', calories: 18, unit: '100g' },
  { id: 'cucumber', name: 'Pepino', emoji: '🥒', calories: 16, unit: '100g' },
  { id: 'zucchini', name: 'Abobrinha', emoji: '🥒', calories: 17, unit: '100g' },
  { id: 'eggplant', name: 'Berinjela', emoji: '🍆', calories: 25, unit: '100g' },
  { id: 'pepper_bell', name: 'Pimentão', emoji: '🫑', calories: 20, unit: '100g' },
  { id: 'onion', name: 'Cebola', emoji: '🧅', calories: 40, unit: '100g' },
  { id: 'garlic', name: 'Alho', emoji: '🧄', calories: 149, unit: '100g' },
  { id: 'mushroom', name: 'Cogumelo Champignon', emoji: '🍄', calories: 22, unit: '100g' },
  { id: 'pumpkin', name: 'Abóbora Cozida', emoji: '🎃', calories: 26, unit: '100g' },
  { id: 'green_beans', name: 'Vagem', emoji: '🥬', calories: 31, unit: '100g' },
  { id: 'cabbage', name: 'Repolho', emoji: '🥬', calories: 25, unit: '100g' },

  // Frutas
  { id: 'banana', name: 'Banana Prata', emoji: '🍌', calories: 89, unit: 'unid' },
  { id: 'apple', name: 'Maçã Fuji', emoji: '🍎', calories: 52, unit: 'unid' },
  { id: 'pear', name: 'Pera', emoji: '🍐', calories: 57, unit: 'unid' },
  { id: 'orange', name: 'Laranja', emoji: '🍊', calories: 47, unit: 'unid' },
  { id: 'tangerine', name: 'Mexerica/Tangerina', emoji: '🍊', calories: 53, unit: 'unid' },
  { id: 'grapes', name: 'Uvas', emoji: '🍇', calories: 69, unit: '100g' },
  { id: 'watermelon', name: 'Melancia', emoji: '🍉', calories: 30, unit: '100g' },
  { id: 'melon', name: 'Melão', emoji: '🍈', calories: 34, unit: '100g' },
  { id: 'papaya', name: 'Mamão Papaia', emoji: '🍈', calories: 43, unit: '100g' },
  { id: 'pineapple', name: 'Abacaxi', emoji: '🍍', calories: 50, unit: '100g' },
  { id: 'mango', name: 'Manga Palmer', emoji: '🥭', calories: 60, unit: '100g' },
  { id: 'avocado', name: 'Abacate', emoji: '🥑', calories: 160, unit: '100g' },
  { id: 'strawberry', name: 'Morango', emoji: '🍓', calories: 32, unit: '100g' },
  { id: 'blueberry', name: 'Mirtilo (Blueberry)', emoji: '🫐', calories: 57, unit: '100g' },
  { id: 'kiwi', name: 'Kiwi', emoji: '🥝', calories: 61, unit: 'unid' },
  { id: 'peach', name: 'Pêssego', emoji: '🍑', calories: 39, unit: 'unid' },
  { id: 'lemon', name: 'Limão', emoji: '🍋', calories: 29, unit: 'unid' },
  { id: 'coconut_meat', name: 'Coco (polpa)', emoji: '🥥', calories: 354, unit: '100g' },
  { id: 'acai_pure', name: 'Açaí (polpa pura)', emoji: '🥣', calories: 60, unit: '100g' },

  // Nozes, Sementes e Castanhas
  { id: 'almond', name: 'Amêndoas', emoji: '🌰', calories: 579, unit: '100g' },
  { id: 'peanut', name: 'Amendoim Torrado', emoji: '🥜', calories: 567, unit: '100g' },
  { id: 'cashew', name: 'Castanha de Caju', emoji: '🌰', calories: 553, unit: '100g' },
  { id: 'walnut', name: 'Nozes', emoji: '🌰', calories: 654, unit: '100g' },
  { id: 'brazil_nut', name: 'Castanha do Pará', emoji: '🌰', calories: 656, unit: '100g' },
  { id: 'chia_seeds', name: 'Sementes de Chia', emoji: '🌱', calories: 486, unit: '100g' },
  { id: 'flax_seeds', name: 'Sementes de Linhaça', emoji: '🌱', calories: 534, unit: '100g' },
  { id: 'sunflower_seeds', name: 'Sementes de Girassol', emoji: '🌻', calories: 584, unit: '100g' },

  // Óleos, Gorduras e Condimentos
  { id: 'olive_oil', name: 'Azeite de Oliva', emoji: '🫒', calories: 884, unit: '100ml' },
  { id: 'coconut_oil', name: 'Óleo de Coco', emoji: '🥥', calories: 862, unit: '100ml' },
  { id: 'butter_unsalted', name: 'Manteiga sem sal', emoji: '🧈', calories: 717, unit: '100g' },
  { id: 'mayonnaise', name: 'Maionese', emoji: '🥣', calories: 680, unit: '100g' },
  { id: 'ketchup', name: 'Ketchup', emoji: '🍅', calories: 112, unit: '100g' },
  { id: 'mustard', name: 'Mostarda', emoji: '🌭', calories: 66, unit: '100g' },
  { id: 'soy_sauce', name: 'Molho Shoyu', emoji: '🥡', calories: 53, unit: '100ml' },
  { id: 'honey', name: 'Mel', emoji: '🍯', calories: 304, unit: '100g' },
  { id: 'sugar_white', name: 'Açúcar Refinado', emoji: '🧂', calories: 387, unit: '100g' },

  // Lanches e Petiscos
  { id: 'potato_chips', name: 'Batata Chips', emoji: '🍟', calories: 536, unit: '100g' },
  { id: 'popcorn', name: 'Pipoca (com óleo)', emoji: '🍿', calories: 387, unit: '100g' },
  { id: 'french_fries', name: 'Batata Frita', emoji: '🍟', calories: 312, unit: '100g' },
  { id: 'pretzel', name: 'Pretzel', emoji: '🥨', calories: 380, unit: '100g' },
  { id: 'crackers', name: 'Bolacha Água e Sal', emoji: '🍘', calories: 421, unit: '100g' },
  { id: 'cheese_bread', name: 'Pão de Queijo', emoji: '🧀', calories: 280, unit: '100g' },
  { id: 'coxinha', name: 'Coxinha de Frango', emoji: '🍗', calories: 300, unit: 'unid (média)' },
  { id: 'pastel_meat', name: 'Pastel de Carne', emoji: '🥟', calories: 250, unit: 'unid (médio)' },

  // Fast-food e Refeições Prontas
  { id: 'pizza_mozzarella', name: 'Pizza de Muçarela', emoji: '🍕', calories: 280, unit: 'fatia' },
  { id: 'pizza_pepperoni', name: 'Pizza de Calabresa', emoji: '🍕', calories: 300, unit: 'fatia' },
  { id: 'burger_cheeseburger', name: 'Cheeseburger', emoji: '🍔', calories: 303, unit: 'unid' },
  { id: 'hotdog', name: 'Cachorro Quente', emoji: '🌭', calories: 290, unit: 'unid' },
  { id: 'sushi_roll', name: 'Sushi (Uramaki)', emoji: '🍣', calories: 40, unit: 'unid' },
  { id: 'lasagna_bolognese', name: 'Lasanha à Bolonhesa', emoji: '🍽️', calories: 135, unit: '100g' },
  { id: 'nuggets', name: 'Nuggets de Frango', emoji: '🍗', calories: 296, unit: '100g' },

  // Doces e Sobremesas
  { id: 'chocolate_milk', name: 'Chocolate ao Leite', emoji: '🍫', calories: 535, unit: '100g' },
  { id: 'chocolate_dark', name: 'Chocolate Amargo (70%)', emoji: '🍫', calories: 598, unit: '100g' },
  { id: 'ice_cream_vanilla', name: 'Sorvete de Creme', emoji: '🍨', calories: 207, unit: '100g' },
  { id: 'cake_chocolate', name: 'Bolo de Chocolate', emoji: '🍰', calories: 371, unit: '100g' },
  { id: 'cookie_chocolate_chip', name: 'Cookie com Gotas de Chocolate', emoji: '🍪', calories: 488, unit: '100g' },
  { id: 'pudding_milk', name: 'Pudim de Leite', emoji: '🍮', calories: 180, unit: '100g' },
  { id: 'brigadeiro', name: 'Brigadeiro', emoji: '🍬', calories: 45, unit: 'unid' },
  { id: 'donut', name: 'Donut (com cobertura)', emoji: '🍩', calories: 452, unit: '100g' },
  { id: 'churros', name: 'Churros (com doce de leite)', emoji: '🥖', calories: 350, unit: 'unid' },

  // Bebidas
  { id: 'water', name: 'Água', emoji: '💧', calories: 0, unit: '200ml' },
  { id: 'coffee_black', name: 'Café Preto (sem açúcar)', emoji: '☕', calories: 2, unit: 'xícara' },
  { id: 'coffee_latte', name: 'Café com Leite', emoji: '☕', calories: 40, unit: 'xícara' },
  { id: 'tea_green', name: 'Chá Verde', emoji: '🍵', calories: 2, unit: 'xícara' },
  { id: 'juice_orange', name: 'Suco de Laranja (natural)', emoji: '🍊', calories: 45, unit: '100ml' },
  { id: 'soda_cola', name: 'Refrigerante Cola', emoji: '🥤', calories: 42, unit: '100ml' },
  { id: 'beer', name: 'Cerveja', emoji: '🍺', calories: 43, unit: '100ml' },
  { id: 'wine_red', name: 'Vinho Tinto', emoji: '🍷', calories: 85, unit: '100ml' },
  { id: 'vodka', name: 'Vodka', emoji: '🍸', calories: 231, unit: '100ml' },
  { id: 'whiskey', name: 'Whisky', emoji: '🥃', calories: 250, unit: '100ml' },
  { id: 'energy_drink', name: 'Bebida Energética', emoji: '⚡', calories: 45, unit: '100ml' },
  { id: 'coconut_water', name: 'Água de Coco', emoji: '🥥', calories: 19, unit: '100ml' },

  // Suplementos e Fitness
  { id: 'whey_protein', name: 'Whey Protein (pó)', emoji: '💪', calories: 370, unit: '100g' },
  { id: 'protein_bar', name: 'Barra de Proteína', emoji: '🍫', calories: 350, unit: '100g' },
  { id: 'creatine', name: 'Creatina', emoji: '💊', calories: 0, unit: '5g' },

  // Pratos Brasileiros
  { id: 'feijoada', name: 'Feijoada Completa', emoji: '🍲', calories: 150, unit: '100g' },
  { id: 'farofa', name: 'Farofa de Mandioca', emoji: '🥣', calories: 400, unit: '100g' },
  { id: 'strogonoff_chicken', name: 'Strogonoff de Frango', emoji: '🥘', calories: 160, unit: '100g' },
  { id: 'moqueca', name: 'Moqueca de Peixe', emoji: '🥘', calories: 120, unit: '100g' },
  { id: 'acai_bowl', name: 'Açaí na Tigela (com granola e banana)', emoji: '🥣', calories: 150, unit: '100g' }
];

export default FOOD_DATABASE;
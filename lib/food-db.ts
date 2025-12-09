export interface FoodItem {
  id: string;
  name: string;
  emoji: string;
  calories: number; // por porção média
  unit: string;
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

  // Tubérculos e raízes
  { id: 'potato', name: 'Batata', emoji: '🥔', calories: 85, unit: '100g' },
  { id: 'sweet_potato', name: 'Batata Doce', emoji: '🍠', calories: 86, unit: '100g' },
  { id: 'cassava', name: 'Mandioca (Aipim)', emoji: '🌿', calories: 160, unit: '100g' },
  { id: 'yam', name: 'Inhame', emoji: '🍠', calories: 118, unit: '100g' },

  // Leguminosas
  { id: 'beans', name: 'Feijão Cozido', emoji: '🫘', calories: 95, unit: '100g' },
  { id: 'lentils', name: 'Lentilha Cozida', emoji: '🥣', calories: 116, unit: '100g' },
  { id: 'chickpeas', name: 'Grão-de-bico', emoji: '🥗', calories: 164, unit: '100g' },
  { id: 'peas', name: 'Ervilhas', emoji: '🥣', calories: 81, unit: '100g' },

  // Proteínas - carnes e aves
  { id: 'chicken', name: 'Frango Grelhado', emoji: '🍗', calories: 165, unit: '100g' },
  { id: 'chicken_breast', name: 'Peito de Frango', emoji: '🍗', calories: 165, unit: '100g' },
  { id: 'turkey', name: 'Peru', emoji: '🦃', calories: 135, unit: '100g' },
  { id: 'beef', name: 'Carne Bovina (magra)', emoji: '🥩', calories: 250, unit: '100g' },
  { id: 'pork', name: 'Carne Suína', emoji: '🍖', calories: 242, unit: '100g' },
  { id: 'lamb', name: 'Carne de Cordeiro', emoji: '🍖', calories: 294, unit: '100g' },
  { id: 'bacon', name: 'Bacon', emoji: '🥓', calories: 541, unit: '100g' },
  { id: 'sausage', name: 'Linguiça/Balada', emoji: '🌭', calories: 301, unit: '100g' },

  // Peixes e frutos do mar
  { id: 'salmon', name: 'Salmão', emoji: '🐟', calories: 208, unit: '100g' },
  { id: 'tuna', name: 'Atum', emoji: '🐟', calories: 132, unit: '100g' },
  { id: 'shrimp', name: 'Camarão', emoji: '🦐', calories: 99, unit: '100g' },
  { id: 'cod', name: 'Bacalhau/Polvo (peixe branco)', emoji: '🐟', calories: 82, unit: '100g' },
  { id: 'sardine', name: 'Sardinha', emoji: '🐟', calories: 208, unit: '100g' },
  { id: 'mackerel', name: 'Cavala', emoji: '🐟', calories: 205, unit: '100g' },

  // Ovos
  { id: 'egg', name: 'Ovo Cozido', emoji: '🥚', calories: 70, unit: 'unid' },
  { id: 'omelette', name: 'Omelete (2 ovos)', emoji: '🍳', calories: 180, unit: 'porção' },

  // Laticínios
  { id: 'milk', name: 'Leite Integral', emoji: '🥛', calories: 60, unit: '100ml' },
  { id: 'milk_sk', name: 'Leite Desnatado', emoji: '🥛', calories: 34, unit: '100ml' },
  { id: 'yogurt', name: 'Iogurte Natural', emoji: '🥛', calories: 59, unit: '100g' },
  { id: 'greek_yogurt', name: 'Iogurte Grego', emoji: '🥣', calories: 97, unit: '100g' },
  { id: 'cheese_cheddar', name: 'Queijo Cheddar', emoji: '🧀', calories: 402, unit: '100g' },
  { id: 'cheese_mozz', name: 'Muçarela', emoji: '🧀', calories: 280, unit: '100g' },
  { id: 'butter', name: 'Manteiga', emoji: '🧈', calories: 717, unit: '100g' },
  { id: 'cream', name: 'Creme de Leite', emoji: '🥛', calories: 340, unit: '100g' },

  // Vegetais
  { id: 'salad', name: 'Salada Mista', emoji: '🥗', calories: 30, unit: 'prato' },
  { id: 'lettuce', name: 'Alface', emoji: '🥬', calories: 15, unit: '100g' },
  { id: 'spinach', name: 'Espinafre', emoji: '🥬', calories: 23, unit: '100g' },
  { id: 'kale', name: 'Couve', emoji: '🥬', calories: 49, unit: '100g' },
  { id: 'broccoli', name: 'Brócolis', emoji: '🥦', calories: 35, unit: '100g' },
  { id: 'cauliflower', name: 'Couve-flor', emoji: '🥦', calories: 25, unit: '100g' },
  { id: 'carrot', name: 'Cenoura', emoji: '🥕', calories: 41, unit: '100g' },
  { id: 'tomato', name: 'Tomate', emoji: '🍅', calories: 18, unit: '100g' },
  { id: 'cucumber', name: 'Pepino', emoji: '🥒', calories: 16, unit: '100g' },
  { id: 'onion', name: 'Cebola', emoji: '🧅', calories: 40, unit: '100g' },
  { id: 'garlic', name: 'Alho', emoji: '🧄', calories: 149, unit: '100g' },
  { id: 'pepper', name: 'Pimentão', emoji: '🫑', calories: 20, unit: '100g' },
  { id: 'eggplant', name: 'Berinjela', emoji: '🍆', calories: 25, unit: '100g' },
  { id: 'mushroom', name: 'Cogumelo', emoji: '🍄', calories: 22, unit: '100g' },

  // Frutas
  { id: 'banana', name: 'Banana', emoji: '🍌', calories: 89, unit: 'unid' },
  { id: 'apple', name: 'Maçã', emoji: '🍎', calories: 52, unit: 'unid' },
  { id: 'orange', name: 'Laranja', emoji: '🍊', calories: 47, unit: 'unid' },
  { id: 'grapes', name: 'Uvas', emoji: '🍇', calories: 69, unit: '100g' },
  { id: 'mango', name: 'Manga', emoji: '🥭', calories: 60, unit: '100g' },
  { id: 'pineapple', name: 'Abacaxi', emoji: '🍍', calories: 50, unit: '100g' },
  { id: 'papaya', name: 'Mamão', emoji: '🍈', calories: 43, unit: '100g' },
  { id: 'avocado', name: 'Abacate', emoji: '🥑', calories: 160, unit: '100g' },
  { id: 'strawberry', name: 'Morangos', emoji: '🍓', calories: 33, unit: '100g' },
  { id: 'blueberry', name: 'Blueberry', emoji: '🫐', calories: 57, unit: '100g' },
  { id: 'watermelon', name: 'Melancia', emoji: '🍉', calories: 30, unit: '100g' },
  { id: 'pear', name: 'Pera', emoji: '🍐', calories: 57, unit: '100g' },
  { id: 'kiwi', name: 'Kiwi', emoji: '🥝', calories: 61, unit: 'unid' },

  // Nuts & seeds
  { id: 'almond', name: 'Amêndoas', emoji: '🌰', calories: 579, unit: '100g' },
  { id: 'peanut', name: 'Amendoim', emoji: '🥜', calories: 567, unit: '100g' },
  { id: 'cashew', name: 'Castanha de Caju', emoji: '🌰', calories: 553, unit: '100g' },
  { id: 'walnut', name: 'Nozes', emoji: '🌰', calories: 654, unit: '100g' },
  { id: 'chia', name: 'Sementes de Chia', emoji: '🫙', calories: 486, unit: '100g' },
  { id: 'sunflower', name: 'Sementes de Girassol', emoji: '🌻', calories: 584, unit: '100g' },

  // Óleos, gorduras e molhos
  { id: 'olive_oil', name: 'Azeite de Oliva', emoji: '🫒', calories: 884, unit: '100g' },
  { id: 'vegetable_oil', name: 'Óleo Vegetal', emoji: '🛢️', calories: 884, unit: '100g' },
  { id: 'mayonnaise', name: 'Maionese', emoji: '🥪', calories: 680, unit: '100g' },
  { id: 'ketchup', name: 'Ketchup', emoji: '🍅', calories: 112, unit: '100g' },
  { id: 'soy_sauce', name: 'Molho de Soja', emoji: '🫙', calories: 53, unit: '100g' },
  { id: 'honey', name: 'Mel', emoji: '🍯', calories: 304, unit: '100g' },
  { id: 'sugar', name: 'Açúcar', emoji: '🧂', calories: 387, unit: '100g' },

  // Lanches e snacks
  { id: 'chips', name: 'Batata Chips', emoji: '🍟', calories: 536, unit: '100g' },
  { id: 'popcorn', name: 'Pipoca (com manteiga)', emoji: '🍿', calories: 550, unit: '100g' },
  { id: 'pretzel', name: 'Pretzel', emoji: '🥨', calories: 380, unit: '100g' },
  { id: 'cracker', name: 'Biscoito Salgado', emoji: '🍘', calories: 450, unit: '100g' },

  // Fast-food e refeições prontas
  { id: 'pizza', name: 'Pizza (fatia média)', emoji: '🍕', calories: 285, unit: 'fatia' },
  { id: 'burger', name: 'Hambúrguer', emoji: '🍔', calories: 500, unit: 'unid' },
  { id: 'fries', name: 'Batata Frita', emoji: '🍟', calories: 312, unit: '100g' },
  { id: 'hotdog', name: 'Cachorro Quente', emoji: '🌭', calories: 290, unit: 'unid' },
  { id: 'sushi', name: 'Sushi (roll)', emoji: '🍣', calories: 200, unit: '6 peças' },

  // Confeitaria e sobremesas
  { id: 'cake', name: 'Bolo (fatia)', emoji: '🍰', calories: 350, unit: 'fatia' },
  { id: 'cookie', name: 'Biscoito Doce', emoji: '🍪', calories: 502, unit: '100g' },
  { id: 'ice_cream', name: 'Sorvete', emoji: '🍨', calories: 207, unit: '100g' },
  { id: 'chocolate', name: 'Chocolate', emoji: '🍫', calories: 546, unit: '100g' },
  { id: 'pudding', name: 'Pudim/Creme', emoji: '🍮', calories: 150, unit: 'porção' },

  // Bebidas
  { id: 'coffee_black', name: 'Café Preto', emoji: '☕', calories: 2, unit: 'xícara' },
  { id: 'coffee_with_milk', name: 'Café com Leite', emoji: '☕', calories: 60, unit: 'xícara' },
  { id: 'tea', name: 'Chá (sem açúcar)', emoji: '🍵', calories: 2, unit: 'xícara' },
  { id: 'soda', name: 'Refrigerante', emoji: '🥤', calories: 40, unit: '100ml' },
  { id: 'juice_orange', name: 'Suco de Laranja', emoji: '🍊', calories: 45, unit: '100ml' },
  { id: 'beer', name: 'Cerveja', emoji: '🍺', calories: 43, unit: '100ml' },
  { id: 'wine_red', name: 'Vinho Tinto', emoji: '🍷', calories: 85, unit: '100ml' },
  { id: 'cocktail', name: 'Coquetel (ex: caipirinha)', emoji: '🍸', calories: 150, unit: 'dose' },

  // Produtos industrializados e derivados
  { id: 'tofu', name: 'Tofu', emoji: '🍱', calories: 76, unit: '100g' },
  { id: 'tempeh', name: 'Tempeh', emoji: '🍱', calories: 192, unit: '100g' },
  { id: 'protein_powder', name: 'Whey Protein', emoji: '💪', calories: 110, unit: 'scoop' },
  { id: 'granola', name: 'Granola', emoji: '🥣', calories: 471, unit: '100g' },

  // Produtos de padaria e confeitaria diversos
  { id: 'croissant', name: 'Croissant', emoji: '🥐', calories: 406, unit: 'unid' },
  { id: 'muffin', name: 'Muffin', emoji: '🧁', calories: 377, unit: 'unid' },
  { id: 'donut', name: 'Donut', emoji: '🍩', calories: 452, unit: 'unid' },

  // Sobremesas tradicionais brasileiras
  { id: 'brigadeiro', name: 'Brigadeiro (docinho)', emoji: '🍬', calories: 90, unit: 'unid' },
  { id: 'pao_de_queijo', name: 'Pão de Queijo', emoji: '🧀', calories: 120, unit: 'unid' },
  { id: 'acaraje', name: 'Acarajé', emoji: '🍤', calories: 250, unit: 'unid' },

  // Cereais e complementos
  { id: 'brownie', name: 'Brownie', emoji: '🍫', calories: 466, unit: '100g' },
  { id: 'peanut_butter', name: 'Manteiga de Amendoim', emoji: '🥜', calories: 588, unit: '100g' },

  // Snacks doces e salgados adicionais
  { id: 'nachos', name: 'Nachos com Queijo', emoji: '🌮', calories: 550, unit: '100g' },
  { id: 'cheese_sticks', name: 'Palitos de Queijo', emoji: '🧀', calories: 330, unit: '100g' },

  // Bebidas lácteas e alternativas
  { id: 'almond_milk', name: 'Leite de Amêndoas', emoji: '🥛', calories: 17, unit: '100ml' },
  { id: 'soy_milk', name: 'Leite de Soja', emoji: '🥛', calories: 54, unit: '100ml' },

  // Pratos comuns
  { id: 'stew', name: 'Ensopado/Guisado', emoji: '🍲', calories: 180, unit: '100g' },
  { id: 'beans_rice', name: 'Feijão com Arroz', emoji: '🍛', calories: 210, unit: 'porção' },
  { id: 'salmon_plate', name: 'Prato com Salmão', emoji: '🍽️', calories: 520, unit: 'prato' },

  // Itens para café da manhã
  { id: 'pancakes', name: 'Panquecas', emoji: '🥞', calories: 227, unit: '100g' },
  { id: 'waffle', name: 'Waffle', emoji: '🧇', calories: 291, unit: '100g' },
  { id: 'cereal_milk', name: 'Cereal com Leite', emoji: '🥣', calories: 200, unit: 'porção' },

  // Ingredientes e condimentos menores
  { id: 'vinegar', name: 'Vinagre', emoji: '🫙', calories: 22, unit: '100g' },
  { id: 'mustard', name: 'Mostarda', emoji: '🌭', calories: 66, unit: '100g' },
  { id: 'jam', name: 'Geleia', emoji: '🍓', calories: 250, unit: '100g' },

  // Outros frutos do mar e peixes
  { id: 'oyster', name: 'Ostra', emoji: '🦪', calories: 68, unit: '100g' },
  { id: 'crab', name: 'Caranguejo', emoji: '🦀', calories: 83, unit: '100g' },

  // Especiarias e aromáticos (valores por 100g geralmente altos por concentração)
  { id: 'cinnamon', name: 'Canela (em pó)', emoji: '🫚', calories: 247, unit: '100g' },
  { id: 'ginger', name: 'Gengibre', emoji: '🫚', calories: 80, unit: '100g' },

  // Bebidas energéticas e isotônicas
  { id: 'energy_drink', name: 'Energético', emoji: '⚡', calories: 45, unit: '100ml' },
  { id: 'sports_drink', name: 'Isotônico', emoji: '🧃', calories: 25, unit: '100ml' },

  // Queijos variados
  { id: 'parmesan', name: 'Parmesão', emoji: '🧀', calories: 431, unit: '100g' },
  { id: 'ricotta', name: 'Ricota', emoji: '🧀', calories: 174, unit: '100g' },
  { id: 'goat_cheese', name: 'Queijo de Cabra', emoji: '🧀', calories: 364, unit: '100g' },

  // Legumes enlatados e conservas
  { id: 'corn_canned', name: 'Milho Enlatado', emoji: '🌽', calories: 96, unit: '100g' },
  { id: 'tuna_canned', name: 'Atum enlatado (óleo)', emoji: '🐟', calories: 198, unit: '100g' },

  // Doces brasileiros tradicionais
  { id: 'quindim', name: 'Quindim', emoji: '🥮', calories: 240, unit: 'unid' },
  { id: 'beijinho', name: 'Beijinho', emoji: '🍬', calories: 80, unit: 'unid' },

  // Saladas compostas
  { id: 'caesar_salad', name: 'Salada Caesar', emoji: '🥗', calories: 180, unit: 'porção' },
  { id: 'greek_salad', name: 'Salada Grega', emoji: '🥗', calories: 150, unit: 'porção' },

  // Substitutos e complementos
  { id: 'breadcrumbs', name: 'Farinha de Rosca', emoji: '🥖', calories: 395, unit: '100g' },
  { id: 'flour', name: 'Farinha de Trigo', emoji: '🌾', calories: 364, unit: '100g' },

  // Produtos congelados
  { id: 'frozen_pizza', name: 'Pizza Congelada (fatia)', emoji: '🍕', calories: 300, unit: 'fatia' },
  { id: 'frozen_veggies', name: 'Legumes Congelados', emoji: '🧊', calories: 50, unit: '100g' },

  // Comidas de rua e petiscos
  { id: 'tapioca', name: 'Tapioca (com recheio)', emoji: '🥞', calories: 200, unit: 'porção' },
  { id: 'esfiha', name: 'Esfiha', emoji: '🥙', calories: 220, unit: 'unid' },

  // Outros grãos
  { id: 'bulgur', name: 'Bulgur', emoji: '🥣', calories: 83, unit: '100g' },
  { id: 'couscous', name: 'Cuscuz', emoji: '🥣', calories: 112, unit: '100g' },

  // Bebidas com leite e shakes
  { id: 'milkshake', name: 'Milkshake', emoji: '🥤', calories: 250, unit: 'copo' },

  // Conservas e antepastos
  { id: 'pickles', name: 'Picles', emoji: '🥒', calories: 11, unit: '100g' },

  // Finalizando com alguns itens populares
  { id: 'cottage', name: 'Cottage', emoji: '🧀', calories: 98, unit: '100g' },
  { id: 'prosciutto', name: 'Presunto Cru (Prosciutto)', emoji: '🥓', calories: 260, unit: '100g' },

  // Placeholder para expansões futuras
];

export default FOOD_DATABASE;

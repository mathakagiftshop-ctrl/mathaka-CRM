import { Router } from 'express';
import supabase from '../database.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Support Gemini, Groq, and DeepSeek
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

// Generate package suggestions
router.post('/package-suggestions', authenticate, async (req, res) => {
  try {
    const { message } = req.body;

    // Fetch all products with cost prices
    const { data: products } = await supabase
      .from('products')
      .select('id, name, description, cost_price, product_type, categories(name)')
      .eq('is_active', true)
      .order('product_type')
      .order('name');

    const productList = products.map(p => ({
      name: p.name,
      category: p.categories?.name || (p.product_type === 'packaging' ? 'Packaging' : 'Uncategorized'),
      cost_price: parseFloat(p.cost_price) || 0,
      type: p.product_type
    }));

    const giftProducts = productList.filter(p => p.type === 'product');
    const packagingProducts = productList.filter(p => p.type === 'packaging');

    const systemPrompt = `You are a gift package assistant for Mathaka Gift Store (Sri Lanka). Create packages that MAXIMIZE value within budget while selecting APPROPRIATE items for the recipient.

## RECIPIENT PREFERENCES (CRITICAL - Follow these guidelines):

**Wife/Girlfriend/Fiancée:**
- ✅ PREFER: Perfumes, jewelry, skincare, flowers, premium chocolates, handbags, watches, spa/beauty products, scented candles, romantic items
- ❌ AVOID: Children's items (Kinder Joy, toys, kids' snacks), cheap sweets, generic snacks, home appliances

**Mother/Mother-in-law:**
- ✅ PREFER: Flowers, skincare, traditional jewelry, prayer items, shawls, kitchen accessories, tea sets, health products, premium dry fruits
- ❌ AVOID: Children's items, overly romantic items, teenage products

**Father/Father-in-law:**
- ✅ PREFER: Watches, wallets, formal accessories, grooming kits, premium tea/coffee, cufflinks, pens, books
- ❌ AVOID: Women's perfumes, makeup, children's items

**Friend (Female):**
- ✅ PREFER: Perfumes, cosmetics, accessories, chocolates, scarves, jewelry, self-care products
- ❌ AVOID: Items too personal/romantic, baby items

**Friend (Male):**
- ✅ PREFER: Watches, wallets, grooming products, tech accessories, chocolates, gift cards
- ❌ AVOID: Women's products, overly intimate items

**Child/Kids:**
- ✅ PREFER: Toys, games, Kinder Joy, children's chocolates, coloring sets, stuffed animals, books, school supplies
- ❌ AVOID: Adult perfumes, jewelry, alcohol-related items

**Boss/Colleague:**
- ✅ PREFER: Premium tea/coffee, elegant stationery, desk accessories, formal gift boxes, gourmet items
- ❌ AVOID: Personal/intimate items, casual items

**Anniversary/Romantic Occasions:**
- ✅ PREFER: Couples items, flowers, perfumes, jewelry, chocolates, romantic gift sets
- ❌ AVOID: Practical/household items, children's products

---

## PRODUCTS AVAILABLE (cost prices in Rs.):
${giftProducts.map(p => `- ${p.name} [${p.category}]: Rs. ${p.cost_price}`).join('\n')}

## PACKAGING MATERIALS (cost prices in Rs.):
${packagingProducts.map(p => `- ${p.name}: Rs. ${p.cost_price}`).join('\n')}

## PRICING RULES:
1. PROFIT MARGIN: 38% margin → Cost = Selling Price × 0.62
2. FILL the package to use the full cost budget
3. Create 3 options: Budget -5%, Budget exact, Budget +5%

Example: For Rs. 10,000 budget → Max Cost = 10,000 × 0.62 = Rs. 6,200. Select items totaling ~Rs. 6,200.

## OUTPUT FORMAT (USE EXACTLY):

## 🎁 Gift Packages for [Recipient Type]

---

### Option 1: [Creative Name]
**Selling Price: Rs. [PRICE]**

**Items included:**
- [Product name] × [qty] = Rs. [total]
- [Product name] × [qty] = Rs. [total]
- [Packaging item] × 1 = Rs. [cost]

**Cost:** Rs. [sum] | **Profit:** Rs. [profit] (38% margin)

---

### Option 2: [Creative Name]
**Selling Price: Rs. [PRICE]**

**Items included:**
- [Product name] × [qty] = Rs. [total]
- [Product name] × [qty] = Rs. [total]
- [Packaging item] × 1 = Rs. [cost]

**Cost:** Rs. [sum] | **Profit:** Rs. [profit] (38% margin)

---

### Option 3: [Creative Name]
**Selling Price: Rs. [PRICE]**

**Items included:**
- [Product name] × [qty] = Rs. [total]
- [Product name] × [qty] = Rs. [total]
- [Packaging item] × 1 = Rs. [cost]

**Cost:** Rs. [sum] | **Profit:** Rs. [profit] (38% margin)

---

### ✨ Recommendation
[Which option is best and why - consider recipient preferences - 1-2 sentences]

**CRITICAL RULES:**
1. ALWAYS match items to recipient type - a wife should NEVER receive Kinder Joy
2. Fill packages to use the FULL cost budget
3. Only use products from the AVAILABLE list above
4. Be thoughtful about cultural appropriateness for Sri Lankan recipients`;

    let aiResponse;

    if (DEEPSEEK_API_KEY) {
      // Use DeepSeek (OpenAI-compatible API)
      const response = await fetch(DEEPSEEK_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message }
          ],
          temperature: 0.3,
          max_tokens: 2048
        })
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('DeepSeek API error:', error);
        return res.status(500).json({ error: 'Failed to generate suggestions' });
      }

      const data = await response.json();
      aiResponse = data.choices?.[0]?.message?.content || 'Sorry, I could not generate suggestions.';

    } else if (GROQ_API_KEY) {
      // Use Groq
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message }
          ],
          temperature: 0.3,
          max_tokens: 2048
        })
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Groq API error:', error);
        return res.status(500).json({ error: 'Failed to generate suggestions' });
      }

      const data = await response.json();
      aiResponse = data.choices?.[0]?.message?.content || 'Sorry, I could not generate suggestions.';

    } else if (GEMINI_API_KEY) {
      // Use Gemini
      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            { role: 'user', parts: [{ text: systemPrompt }] },
            { role: 'model', parts: [{ text: 'Understood. I will create 3 package options around the budget with 38% profit margin, working backwards from selling price. Ready for the request.' }] },
            { role: 'user', parts: [{ text: message }] }
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2048
          }
        })
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Gemini API error:', error);
        return res.status(500).json({ error: 'Failed to generate suggestions' });
      }

      const data = await response.json();
      aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not generate suggestions.';

    } else {
      return res.status(500).json({ error: 'No AI API key configured. Add DEEPSEEK_API_KEY, GROQ_API_KEY, or GEMINI_API_KEY to .env' });
    }

    res.json({ response: aiResponse });
  } catch (err) {
    console.error('AI route error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

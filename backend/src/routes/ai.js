import { Router } from 'express';
import supabase from '../database.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Support both Gemini and Groq
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

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

    const systemPrompt = `You are a gift package assistant for Mathaka Gift Store (Sri Lanka). Create packages that MAXIMIZE value within budget.

PRODUCTS AVAILABLE (cost prices in Rs.):
${giftProducts.map(p => `- ${p.name} [${p.category}]: Rs. ${p.cost_price}`).join('\n')}

PACKAGING MATERIALS (cost prices in Rs.):
${packagingProducts.map(p => `- ${p.name}: Rs. ${p.cost_price}`).join('\n')}

RULES:
1. PROFIT MARGIN: 38% margin → Cost = Selling Price × 0.62
2. FILL the package to use the full cost budget
3. Create 3 options: Budget -5%, Budget exact, Budget +5%

For Rs. 10,000 budget: Max Cost = 10,000 × 0.62 = Rs. 6,200. Select items totaling ~Rs. 6,200.

USE THIS EXACT FORMAT:

## 🎁 Gift Packages for [Recipient]

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
[Which option is best and why - 1-2 sentences]

IMPORTANT: Fill packages to use the FULL cost budget. Do not waste budget!`;

    let aiResponse;

    if (GROQ_API_KEY) {
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
      return res.status(500).json({ error: 'No AI API key configured. Add GROQ_API_KEY or GEMINI_API_KEY to .env' });
    }

    res.json({ response: aiResponse });
  } catch (err) {
    console.error('AI route error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

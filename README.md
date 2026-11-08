# AI Toplantı Tutanağı — nejdettut.com

Toplantı notları veya transcript → yapılandırılmış tutanak + Word (.docx).

- **Girdi:** toplantı başlığı + tarih + katılımcı listesi (opsiyonel) + tür +
  serbest notlar/transcript (50-15.000 karakter)
- **Çıktı (zod şema):** başlık + tarih + katılımcılar + gündem + tartışılan
  maddeler (topic/summary) + alınan kararlar + aksiyon maddeleri
  (task/sorumlu/tarih/öncelik) + açık sorular + sonraki toplantı + imza notu
- **Model:** Groq `openai/gpt-oss-120b` tek `generateObject`
- **Export:** `docx` library ile server-side Word üretimi
- **Rate limit:** 15 tutanak/saat/IP

Bu uygulama [nejdettut.com](https://www.nejdettut.com) koleksiyonunun bir parçasıdır.

## Geliştirme

```bash
npm install
cp .env.example .env.local   # GROQ_API_KEY ekleyin
npm run dev
```

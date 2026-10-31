function question(settings, index) {
  const { role, language, type, totalQuestions } = settings;
  const id = type === 'hr' ? [
    `Ceritakan tentang diri Anda dan alasan Anda tertarik pada posisi ${role}.`,
    `Pengalaman, kegiatan kuliah, atau proyek apa yang paling relevan dengan posisi ${role}? Jelaskan kontribusi Anda.`,
    'Ceritakan saat Anda menghadapi tantangan dalam tim. Bagaimana Anda menanganinya?',
    'Bagaimana Anda menentukan prioritas ketika beberapa tugas memiliki tenggat yang bersamaan?',
    `Keterampilan apa yang sedang Anda kembangkan untuk menjadi ${role} yang lebih baik, dan bagaimana Anda melatihnya?`,
    'Ceritakan contoh saat Anda menerima masukan yang sulit. Apa yang Anda lakukan setelahnya?',
    `Mengapa perusahaan sebaiknya mempertimbangkan Anda untuk posisi ${role}? Gunakan contoh yang nyata.`,
  ] : [
    `Untuk posisi ${role}, jelaskan satu proyek atau tugas yang paling menunjukkan kemampuan teknis Anda.`,
    `Bagaimana alur Anda menyelesaikan masalah baru dalam pekerjaan seorang ${role}, dari memahami kebutuhan hingga memeriksa hasil?`,
    `Alat atau metode apa yang Anda pilih untuk sebuah tugas ${role}, dan apa pertimbangan serta keterbatasannya?`,
    'Jika hasil pekerjaan tidak sesuai harapan, bagaimana Anda mencari penyebabnya secara sistematis?',
    `Bagaimana Anda memastikan kualitas dan ketepatan hasil kerja pada posisi ${role}? Berikan contoh pemeriksaannya.`,
    'Ceritakan satu pilihan teknis yang memiliki beberapa alternatif. Bagaimana Anda menimbang kelebihan dan risikonya?',
    `Bagaimana Anda menjelaskan keputusan teknis sebagai ${role} kepada rekan yang tidak memiliki latar belakang teknis?`,
  ];
  const en = type === 'hr' ? [
    `Tell me about yourself and why you are interested in the ${role} position.`,
    `Which experience, university activity, or project best relates to the ${role} position? Explain your contribution.`,
    'Tell me about a challenge you faced in a team. How did you handle it?',
    'How do you prioritize several tasks with competing deadlines?',
    `Which skill are you developing to become a better ${role}, and how are you practicing it?`,
    'Describe a time you received difficult feedback. What did you do next?',
    `Why should a company consider you for the ${role} position? Use a real example.`,
  ] : [
    `For the ${role} position, describe a project or task that best demonstrates your technical skills.`,
    `How would you approach a new problem as a ${role}, from understanding the requirements to verifying the result?`,
    `Which tool or method would you choose for a ${role} task, and what are its trade-offs?`,
    'When your work produces an unexpected result, how do you investigate the cause systematically?',
    `How do you verify the quality and accuracy of your work as a ${role}? Give an example of a check.`,
    'Describe a technical decision with several possible solutions. How would you compare their benefits and risks?',
    `How would you explain a technical decision as a ${role} to a colleague without a technical background?`,
  ];
  return language === 'en'
    ? `Sample question ${index + 1} of ${totalQuestions}\n\n${en[index]}`
    : `Contoh pertanyaan ${index + 1} dari ${totalQuestions}\n\n${id[index]}`;
}

export function createDemoResponse({ action, settings, questionIndex }) {
  const en = settings.language === 'en';
  const base = { mode: 'demo', reply: '', feedback: null, summary: null };
  if (action === 'start') return { ...base, reply: question(settings, 0) };
  if (action === 'summary') return {
    ...base,
    reply: en ? 'Sample session complete. The notes below are a practice checklist, not an assessment of your answers.' : 'Sesi contoh selesai. Catatan berikut adalah panduan latihan, bukan penilaian atas jawaban Anda.',
    summary: {
      score: null,
      headline: en ? 'Sample practice summary - not assessed by AI' : 'Contoh ringkasan latihan - belum dinilai AI',
      strengths: [en ? 'Example strength to demonstrate: explain your own contribution with a specific situation.' : 'Contoh kekuatan yang dapat ditunjukkan: jelaskan kontribusi pribadi dalam situasi yang spesifik.'],
      improvements: [en ? 'Practice describing the situation, your action, and the result without inventing experience or numbers.' : 'Latih penjelasan situasi, tindakan Anda, dan hasilnya tanpa mengarang pengalaman atau angka.'],
      nextSteps: [
        en ? `Prepare two real examples relevant to a ${settings.role} role.` : `Siapkan dua contoh pengalaman nyata yang relevan dengan posisi ${settings.role}.`,
        en ? 'Practice a concise answer aloud, then check whether your personal contribution is clear.' : 'Latih jawaban singkat dengan suara lantang, lalu cek apakah kontribusi pribadi Anda sudah jelas.',
        en ? 'Enable Gemini with a server API key for feedback based on your actual answers.' : 'Aktifkan Gemini melalui API key di server untuk memperoleh umpan balik berdasarkan jawaban Anda.',
      ],
    },
  };
  return {
    ...base,
    reply: questionIndex < settings.totalQuestions ? question(settings, questionIndex) : (en ? 'You have completed all sample questions. Open the summary for a practice checklist.' : 'Semua contoh pertanyaan sudah selesai. Buka ringkasan untuk melihat panduan latihan.'),
    feedback: {
      score: null,
      strengths: [en ? 'Sample tip: show a specific action you took, rather than only listing a skill.' : 'Contoh saran: tunjukkan tindakan spesifik yang Anda lakukan, selain menyebutkan keterampilan.'],
      improvements: [en ? 'This demo does not analyze your answer. Use a real situation, explain your contribution, and describe the result.' : 'Demo ini tidak menganalisis jawaban Anda. Gunakan situasi nyata, jelaskan kontribusi Anda, lalu sebutkan hasilnya.'],
      sampleAnswer: en
        ? `Answer template for ${settings.role}: "In [a real project or activity], the challenge was [situation]. I was responsible for [task]. I [specific action], which resulted in [a verifiable result]. I learned [lesson]." Replace the brackets with your own experience.`
        : `Kerangka jawaban untuk ${settings.role}: "Dalam [proyek atau kegiatan nyata], tantangannya adalah [situasi]. Saya bertanggung jawab atas [tugas]. Saya melakukan [tindakan spesifik], sehingga [hasil yang dapat dibuktikan]. Saya belajar [pelajaran]." Isi bagian kurung dengan pengalaman Anda sendiri.`,
    },
  };
}

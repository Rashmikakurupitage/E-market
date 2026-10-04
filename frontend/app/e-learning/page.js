'use client';

import { BookOpen, Video, FileText, CheckCircle, Award } from 'lucide-react';

export default function ELearning() {
  const courses = [
    {
      id: 1,
      title: 'WhatsApp Business හරහා භාණ්ඩ අලෙවි කරන්නේ කෙසේද?',
      category: 'Digital Marketing',
      duration: '45 mins',
      modules: 4,
      level: 'ආධුනිකයන් සඳහා',
      description: 'ඔබගේ ජංගම දුරකථනය භාවිතයෙන් WhatsApp Catalog සාදා පාරිභෝගිකයින් වෙත සෘජුවම අලෙවි කරන ආකාරය ඉගෙන ගන්න.',
    },
    {
      id: 2,
      title: 'නිෂ්පාදන සඳහා නිවැරදි මිලක් (Pricing Strategy) තීරණය කිරීම',
      category: 'Financial Management',
      duration: '1 hour',
      modules: 3,
      level: 'මධ්‍යම මට්ටම',
      description: 'අමුද්‍රව්‍ය පිරිවැය, ප්‍රවාහන ගාස්තු සහ ලාභාංශ ගණනය කර නිවැරදි අලෙවි මිලක් සකස් කරගන්නා ආකාරය.',
    },
    {
      id: 3,
      title: 'ජංගම දුරකථනයෙන් ආකර්ෂණීය ඡායාරූප (Product Photography) ගැනීම',
      category: 'Branding',
      duration: '30 mins',
      modules: 5,
      level: 'ආධුනිකයන් සඳහා',
      description: 'ස්වාභාවික ආලෝකය භාවිත කරමින් ඔබේ හස්තකර්මාන්ත සහ නිෂ්පාදන පැහැදිලිව ඡායාරූපගත කරන්නේ කෙසේද?',
    }
  ];

  return (
    <div className="flex-1 bg-slate-100 py-10 px-4 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Banner */}
        <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 rounded-2xl p-8 text-white border-b-4 border-amber-500 shadow-xl">
          <span className="inline-flex items-center gap-1 bg-amber-500 text-slate-950 text-[10px] font-black px-2.5 py-1 rounded uppercase tracking-wider">
            <Award className="w-3.5 h-3.5" /> Ministry Capacity Building Initiative
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold mt-3">ව්‍යාපාරික වර්ධනය සඳහා ඊ-ඉගෙනුම් පියස</h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl">
            කාන්තා හා ළමා කටයුතු අමාත්‍‍යාංශය මගින් මෙහෙයවන නොමිලේ ඩිජිටල් ව්‍යාපාර පාඨමාලා මාලාව.
          </p>
        </div>

        {/* Course Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {courses.map((course) => (
            <div key={course.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div className="p-6 space-y-3">
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-full border border-emerald-200">
                  {course.category}
                </span>
                <h3 className="font-extrabold text-slate-800 text-base leading-snug">{course.title}</h3>
                <p className="text-slate-500 text-xs leading-relaxed">{course.description}</p>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 space-y-4">
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                  <span className="flex items-center gap-1"><Video className="w-3.5 h-3.5 text-emerald-700" /> {course.duration}</span>
                  <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5 text-emerald-700" /> Mod {course.modules}</span>
                </div>

                <button className="w-full bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  <span>පාඨමාලාව ආරම්භ කරන්න</span>
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
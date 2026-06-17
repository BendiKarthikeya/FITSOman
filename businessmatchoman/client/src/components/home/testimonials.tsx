import { Star, StarHalf } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useRTL } from "@/hooks/use-rtl";

export default function Testimonials() {
  const { t } = useTranslation();
  const { isRtl } = useRTL();
  
  // Mock testimonials data with bilingual content
  const testimonials = [
    {
      id: 1,
      rating: 5,
      text_en: "I found the perfect investor for my restaurant through TEEJARTI. The platform made it easy to showcase my business and connect with serious investors.",
      text_ar: "وجدت المستثمر المثالي لمطعمي من خلال تيجارتي. جعلت المنصة من السهل عرض عملي والتواصل مع مستثمرين جديين.",
      name_en: "Ahmed Al-Balushi",
      name_ar: "أحمد البلوشي",
      position_en: "Restaurant Owner, Muscat",
      position_ar: "صاحب مطعم، مسقط",
      image:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80",
    },
    {
      id: 2,
      rating: 5,
      text_en: "As an investor, I've found multiple promising opportunities in Oman through TEEJARTI. The verification process gives me confidence in the listings.",
      text_ar: "كمستثمرة، وجدت عدة فرص واعدة في عُمان من خلال تيجارتي. عملية التحقق تعطيني الثقة في القوائم.",
      name_en: "Sarah Al-Harthy",
      name_ar: "سارة الحارثية",
      position_en: "Angel Investor, Dubai",
      position_ar: "مستثمرة ملائكية، دبي",
      image:
        "https://images.unsplash.com/photo-1551836022-deb4988cc6c0?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80",
    },
    {
      id: 3,
      rating: 4.5,
      text_en: "TEEJARTI helped me sell my manufacturing business in just 3 months. The platform connected me with serious buyers who understood the value of my business.",
      text_ar: "ساعدني تيجارتي في بيع شركتي التصنيعية في 3 أشهر فقط. ربطتني المنصة بمشترين جديين فهموا قيمة عملي التجاري.",
      name_en: "Khalid Al-Zadjali",
      name_ar: "خالد الزدجالي",
      position_en: "Business Owner, Sohar",
      position_ar: "صاحب عمل، صحار",
      image:
        "https://images.unsplash.com/photo-1560250097-0b93528c311a?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80",
    },
  ];

  // Render stars for rating
  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={`star-${i}`} className="h-4 w-4 fill-current" />);
    }

    if (hasHalfStar) {
      stars.push(<StarHalf key="half-star" className="h-4 w-4 fill-current" />);
    }

    const emptyStars = 5 - stars.length;
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Star
          key={`empty-star-${i}`}
          className="h-4 w-4 stroke-current fill-transparent"
        />,
      );
    }

    return stars;
  };

  return (
    <section className="py-20 md:py-24 bg-neutral-100">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className={`text-3xl md:text-4xl font-bold mb-6 text-gray-800 ${isRtl ? 'font-arabic' : 'font-heading'}`}>
            {t('home.testimonials.title')}
          </h2>
          <p className={`text-gray-600 max-w-3xl mx-auto text-lg leading-relaxed ${isRtl ? 'font-arabic' : ''}`}>
            {t('home.testimonials.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
          {testimonials.map((testimonial) => {
            const text = isRtl ? testimonial.text_ar : testimonial.text_en;
            const name = isRtl ? testimonial.name_ar : testimonial.name_en;
            const position = isRtl ? testimonial.position_ar : testimonial.position_en;
            
            return (
              <div
                key={testimonial.id}
                className={`bg-white p-6 rounded-xl shadow-md ${isRtl ? 'text-right' : ''}`}
              >
                <div className={`flex items-center mb-4 ${isRtl ? 'justify-end' : ''}`}>
                  <div className="text-amber-400 flex">
                    {renderStars(testimonial.rating)}
                  </div>
                </div>
                <p className={`text-neutral-600 mb-6 ${isRtl ? 'font-arabic leading-relaxed' : ''}`}>
                  "{text}"
                </p>
                <div className={`flex items-center ${isRtl ? 'flex-row-reverse' : ''}`}>
                  <div className="w-12 h-12 rounded-full bg-neutral-200 overflow-hidden">
                    <img
                      src={testimonial.image}
                      alt={name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="ml-4">
                    <h4 className={`font-bold ${isRtl ? 'font-arabic' : ''}`}>
                      {name}
                    </h4>
                    <p className={`text-sm text-neutral-500 ${isRtl ? 'font-arabic' : ''}`}>
                      {position}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

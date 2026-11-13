import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial sample survey...');

  const existing = await prisma.survey.findUnique({
    where: { slug: 'customer-feedback' },
  });

  if (existing) {
    console.log('Sample survey already exists with ID:', existing.id);
    return;
  }

  const sampleSurvey = await prisma.survey.create({
    data: {
      title: 'Customer Satisfaction & Experience Survey',
      description: 'Thank you for visiting! Please take 30 seconds to let us know how your experience was today. Works online or offline.',
      slug: 'customer-feedback',
      questions: JSON.stringify([
        {
          id: 'q_satisfaction',
          title: 'Overall, how would you rate your experience today?',
          type: 'rating',
          required: true,
          minRating: 1,
          maxRating: 5,
        },
        {
          id: 'q_aspects',
          title: 'Which aspects were you most satisfied with?',
          type: 'multi_choice',
          required: false,
          options: [
            'Staff friendliness & courtesy',
            'Speed of service',
            'Quality & cleanliness',
            'Clear communication & guidance',
            'Value for money',
          ],
        },
        {
          id: 'q_source',
          title: 'How did you hear about us?',
          type: 'single_choice',
          required: false,
          options: [
            'Word of mouth / Friend referral',
            'Social Media (Instagram/TikTok/Facebook)',
            'Google Maps / Search',
            'Walked by / In-store signage',
          ],
        },
        {
          id: 'q_feedback',
          title: 'Do you have any suggestions or comments to help us improve?',
          type: 'long_text',
          required: false,
        },
        {
          id: 'q_recommend',
          title: 'Would you recommend us to colleagues or friends?',
          type: 'dropdown',
          required: true,
          options: ['Definitely Yes', 'Probably Yes', 'Not Sure', 'Probably Not', 'Definitely Not'],
        },
      ]),
    },
  });

  console.log('Created sample survey successfully with ID:', sampleSurvey.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

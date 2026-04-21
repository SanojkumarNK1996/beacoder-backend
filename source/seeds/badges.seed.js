const Badge = require('../models/Badge.model');

const seedBadges = async () => {
  try {
    const badges = [
      { name: 'First Steps', description: 'Completed your first 5 learning milestones', milestone: 5, icon: 'footprints' },
      { name: 'Knowledge Seeker', description: 'Explored 10 learning milestones', milestone: 10, icon: 'compass' },
      { name: 'Wisdom Builder', description: 'Accumulated wisdom through 15 milestones', milestone: 15, icon: 'book-open' },
      { name: 'Mastery Achiever', description: 'Achieved mastery with 20 milestones', milestone: 20, icon: 'trophy' },
      { name: 'Learning Legend', description: 'Became a legend by completing 25 milestones', milestone: 25, icon: 'crown' },
      { name: 'Scholar Supreme', description: 'Reached supreme scholarship at 30 milestones', milestone: 30, icon: 'graduation-cap' },
      { name: 'Insight Illuminator', description: 'Illuminated insights through 35 milestones', milestone: 35, icon: 'lightbulb' },
      { name: 'Expertise Exemplar', description: 'Exemplified expertise with 40 milestones', milestone: 40, icon: 'star' },
      { name: 'Genius Guardian', description: 'Guarded genius knowledge at 45 milestones', milestone: 45, icon: 'shield' },
      { name: 'Pinnacle Pioneer', description: 'Pioneered pinnacles of learning at 50 milestones', milestone: 50, icon: 'mountain' },
      { name: 'Ultimate Understander', description: 'Achieved ultimate understanding at 55 milestones', milestone: 55, icon: 'brain' },
      { name: 'Enlightenment Emperor', description: 'Emperored enlightenment with 60 milestones', milestone: 60, icon: 'crown' },
      { name: 'Wisdom Warrior', description: 'Fought for wisdom through 65 milestones', milestone: 65, icon: 'sword' },
      { name: 'Knowledge Knight', description: 'Knighted in knowledge at 70 milestones', milestone: 70, icon: 'knight' },
      { name: 'Learning Luminary', description: 'Became a luminary of learning at 75 milestones', milestone: 75, icon: 'sun' },
      { name: 'Mastery Monarch', description: 'Ruled mastery with 80 milestones', milestone: 80, icon: 'crown' },
      { name: 'Scholar Sovereign', description: 'Sovereigned scholarship at 85 milestones', milestone: 85, icon: 'throne' },
      { name: 'Insight Icon', description: 'Iconified insights at 90 milestones', milestone: 90, icon: 'gem' },
      { name: 'Expertise Emperor', description: 'Emperored expertise with 95 milestones', milestone: 95, icon: 'crown' },
      { name: 'Century Scholar', description: 'Achieved centennial scholarship at 100 milestones', milestone: 100, icon: 'hundred' },
      { name: 'Milestone Master', description: 'Mastered milestones at 105', milestone: 105, icon: 'trophy' },
      { name: 'Knowledge Conqueror', description: 'Conquered knowledge realms at 110 milestones', milestone: 110, icon: 'sword' },
      { name: 'Wisdom Wizard', description: 'Wielded wisdom magic at 115 milestones', milestone: 115, icon: 'wand' },
      { name: 'Learning Lord', description: 'Lords over learning at 120 milestones', milestone: 120, icon: 'crown' },
      { name: 'Supreme Sage', description: 'Attained supreme sage status at 125 milestones', milestone: 125, icon: 'sage' },
      // Add more as needed
    ];

    for (const badge of badges) {
      await Badge.findOrCreate({
        where: { milestone: badge.milestone },
        defaults: badge
      });
    }

    console.log('Badges seeded successfully');
  } catch (error) {
    console.error('Error seeding badges:', error);
  }
};

module.exports = seedBadges;
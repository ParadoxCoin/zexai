// MongoDB initialization script
// Creates database, collections, and indexes

// Switch to ai_saas database
db = db.getSiblingDB('ai_saas');

// Create collections
db.createCollection('users');
db.createCollection('user_credits');
db.createCollection('usage_logs');
db.createCollection('media_outputs');
db.createCollection('image_tasks');
db.createCollection('video_tasks');
db.createCollection('audio_tasks');
db.createCollection('synapse_tasks');
db.createCollection('synapse_logs');
db.createCollection('service_costs');
db.createCollection('pricing_packages');
db.createCollection('credit_rates');

// Create indexes for better performance
print('Creating indexes...');

// Users collection
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "id": 1 }, { unique: true });
db.users.createIndex({ "created_at": 1 });
db.users.createIndex({ "role": 1 });

// User credits collection
db.user_credits.createIndex({ "user_id": 1 }, { unique: true });
db.user_credits.createIndex({ "updated_at": 1 });

// Usage logs collection
db.usage_logs.createIndex({ "user_id": 1, "created_at": -1 });
db.usage_logs.createIndex({ "service_type": 1 });
db.usage_logs.createIndex({ "created_at": 1 });

// Media outputs collection
db.media_outputs.createIndex({ "user_id": 1, "created_at": -1 });
db.media_outputs.createIndex({ "service_type": 1 });
db.media_outputs.createIndex({ "is_showcase": 1, "created_at": -1 });

// Task collections
db.image_tasks.createIndex({ "task_id": 1 }, { unique: true });
db.image_tasks.createIndex({ "user_id": 1, "created_at": -1 });
db.image_tasks.createIndex({ "status": 1 });

db.video_tasks.createIndex({ "task_id": 1 }, { unique: true });
db.video_tasks.createIndex({ "user_id": 1, "created_at": -1 });
db.video_tasks.createIndex({ "status": 1 });

db.audio_tasks.createIndex({ "task_id": 1 }, { unique: true });
db.audio_tasks.createIndex({ "user_id": 1, "created_at": -1 });
db.audio_tasks.createIndex({ "status": 1 });

db.synapse_tasks.createIndex({ "task_id": 1 }, { unique: true });
db.synapse_tasks.createIndex({ "user_id": 1, "created_at": -1 });
db.synapse_tasks.createIndex({ "status": 1 });

// Service costs collection
db.service_costs.createIndex({ "service_type": 1, "provider": 1, "model_id": 1 }, { unique: true });
db.service_costs.createIndex({ "is_active": 1 });

// Pricing packages collection
db.pricing_packages.createIndex({ "name": 1 }, { unique: true });
db.pricing_packages.createIndex({ "is_active": 1 });

// Credit rates collection
db.credit_rates.createIndex({ "is_active": 1 });

print('Database initialization completed!');


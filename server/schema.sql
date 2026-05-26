CREATE DATABASE IF NOT EXISTS `azurekiln_ai_hub`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `azurekiln_ai_hub`;

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(180) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY users_email_unique (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stations (
  id VARCHAR(80) NOT NULL,
  name VARCHAR(160) NOT NULL,
  tagline VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  url VARCHAR(500) NOT NULL,
  category VARCHAR(80) NOT NULL,
  tags JSON NOT NULL,
  models JSON NOT NULL,
  region VARCHAR(80) NOT NULL,
  latency INT UNSIGNED NOT NULL DEFAULT 0,
  uptime VARCHAR(40) NOT NULL,
  status ENUM('online', 'degraded', 'offline') NOT NULL DEFAULT 'online',
  security JSON NOT NULL,
  pricing VARCHAR(160) NOT NULL,
  launch_label VARCHAR(80) NOT NULL,
  icon VARCHAR(80) NOT NULL,
  accent VARCHAR(40) NOT NULL,
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  score INT UNSIGNED NOT NULL DEFAULT 0,
  api_shape VARCHAR(120) NOT NULL,
  use_cases JSON NOT NULL,
  docs VARCHAR(500) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY stations_category_idx (category),
  KEY stations_score_idx (score)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS favorites (
  user_id INT UNSIGNED NOT NULL,
  station_id VARCHAR(80) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, station_id),
  CONSTRAINT favorites_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT favorites_station_fk FOREIGN KEY (station_id) REFERENCES stations (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

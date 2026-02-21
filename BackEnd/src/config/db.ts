import pkg from 'pg'
const { Pool } = pkg

export const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'learnDatabase',
  password: 'nhongplus',
  port: 5432,
})
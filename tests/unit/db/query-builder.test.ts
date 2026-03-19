// T022: QueryBuilder tests
import { describe, it, expect } from 'vitest';
import { QueryBuilder } from '@/db/query-builder';

describe('QueryBuilder', () => {
  describe('SELECT', () => {
    it('should build simple SELECT', () => {
      const q = QueryBuilder.select('users', ['id', 'name']);
      expect(q.toSql('sqlite')).toBe('SELECT id, name FROM users');
      expect(q.getParams()).toEqual([]);
    });

    it('should build SELECT * when no columns', () => {
      const q = QueryBuilder.select('users');
      expect(q.toSql('sqlite')).toBe('SELECT * FROM users');
    });

    it('should add WHERE =', () => {
      const q = QueryBuilder.select('users', ['id', 'name']).where('id', '=', '123');
      expect(q.toSql('sqlite')).toBe('SELECT id, name FROM users WHERE id = ?');
      expect(q.toSql('postgresql')).toBe('SELECT id, name FROM users WHERE id = $1');
      expect(q.getParams()).toEqual(['123']);
    });

    it('should chain multiple WHERE with AND', () => {
      const q = QueryBuilder.select('users')
        .where('active', '=', true)
        .where('role', '=', 'ADMIN');
      expect(q.toSql('sqlite')).toBe('SELECT * FROM users WHERE active = ? AND role = ?');
      expect(q.getParams()).toEqual([true, 'ADMIN']);
    });

    it('should support IS NULL', () => {
      const q = QueryBuilder.select('patients').whereNull('discharged_at');
      expect(q.toSql('sqlite')).toBe('SELECT * FROM patients WHERE discharged_at IS NULL');
    });

    it('should support IN', () => {
      const q = QueryBuilder.select('hospitals').whereIn('level', ['M1', 'M2', 'A_S']);
      expect(q.toSql('sqlite')).toBe('SELECT * FROM hospitals WHERE level IN (?, ?, ?)');
      expect(q.toSql('postgresql')).toBe('SELECT * FROM hospitals WHERE level IN ($1, $2, $3)');
      expect(q.getParams()).toEqual(['M1', 'M2', 'A_S']);
    });

    it('should support LIKE', () => {
      const q = QueryBuilder.select('users').where('name', 'LIKE', '%สม%');
      expect(q.toSql('sqlite')).toBe('SELECT * FROM users WHERE name LIKE ?');
    });

    it('should support ORDER BY', () => {
      const q = QueryBuilder.select('patients').orderBy('admit_date', 'DESC');
      expect(q.toSql('sqlite')).toBe('SELECT * FROM patients ORDER BY admit_date DESC');
    });

    it('should support LIMIT and OFFSET', () => {
      const q = QueryBuilder.select('patients').limit(20).offset(40);
      expect(q.toSql('sqlite')).toBe('SELECT * FROM patients LIMIT 20 OFFSET 40');
    });

    it('should support JOINs', () => {
      const q = QueryBuilder.select('hospitals', ['h.hcode', 'h.name'])
        .join('LEFT JOIN', 'cached_patients cp', 'cp.hospital_id = h.id');
      expect(q.toSql('sqlite')).toBe(
        'SELECT h.hcode, h.name FROM hospitals LEFT JOIN cached_patients cp ON cp.hospital_id = h.id',
      );
    });
  });

  describe('INSERT', () => {
    it('should build INSERT', () => {
      const q = QueryBuilder.insert('users', { id: '1', name: 'Alice', active: true });
      expect(q.toSql('sqlite')).toBe('INSERT INTO users (id, name, active) VALUES (?, ?, ?)');
      expect(q.toSql('postgresql')).toBe(
        'INSERT INTO users (id, name, active) VALUES ($1, $2, $3)',
      );
      expect(q.getParams()).toEqual(['1', 'Alice', true]);
    });
  });

  describe('UPDATE', () => {
    it('should build UPDATE with WHERE', () => {
      const q = QueryBuilder.update('users', { name: 'Bob', active: false }).where(
        'id',
        '=',
        '1',
      );
      expect(q.toSql('sqlite')).toBe('UPDATE users SET name = ?, active = ? WHERE id = ?');
      expect(q.getParams()).toEqual(['Bob', false, '1']);
    });
  });

  describe('DELETE', () => {
    it('should build DELETE with WHERE', () => {
      const q = QueryBuilder.delete('sessions').where('expires_at', '<', '2026-01-01');
      expect(q.toSql('sqlite')).toBe('DELETE FROM sessions WHERE expires_at < ?');
      expect(q.getParams()).toEqual(['2026-01-01']);
    });
  });
});

import { vi, describe, it, expect, beforeEach } from 'vitest'
import {
  fetchCircles,
  fetchCircleMembers,
  fetchCircleMemberCounts,
  createCircle,
  deleteCircle,
  addCircleMember,
  removeCircleMember,
} from '../supaCircles'

const supabaseMock = vi.hoisted(() => ({
  from: vi.fn(),
}))

vi.mock('../../supabaseClient', () => ({
  supabase: supabaseMock,
}))

beforeEach(() => {
  supabaseMock.from.mockReset()
})

describe('supaCircles API', () => {
  describe('fetchCircles', () => {
    it('fetches circles for a given user ordered by created_at', async () => {
      const userId = 'user-123'
      const expectedCircles = [
        { id: 'c1', name: 'Work Friends' },
        { id: 'c2', name: 'Family' },
      ]
      const order = vi.fn().mockResolvedValue({ data: expectedCircles, error: null })
      const eq = vi.fn(() => ({ order }))
      const select = vi.fn(() => ({ eq }))
      supabaseMock.from.mockReturnValue({ select })

      const circles = await fetchCircles(userId)

      expect(supabaseMock.from).toHaveBeenCalledWith('friend_circles')
      expect(select).toHaveBeenCalledWith('id, name')
      expect(eq).toHaveBeenCalledWith('user_id', userId)
      expect(order).toHaveBeenCalledWith('created_at', { ascending: true })
      expect(circles).toEqual(expectedCircles)
    })

    it('returns empty array when Supabase returns error', async () => {
      const error = new Error('db error')
      const order = vi.fn().mockResolvedValue({ data: null, error })
      const eq = vi.fn(() => ({ order }))
      const select = vi.fn(() => ({ eq }))
      supabaseMock.from.mockReturnValue({ select })

      const circles = await fetchCircles('user-1')

      expect(circles).toEqual([])
    })

    it('returns empty array when data is null', async () => {
      const order = vi.fn().mockResolvedValue({ data: null, error: null })
      const eq = vi.fn(() => ({ order }))
      const select = vi.fn(() => ({ eq }))
      supabaseMock.from.mockReturnValue({ select })

      const circles = await fetchCircles('user-1')

      expect(circles).toEqual([])
    })
  })

  describe('fetchCircleMembers', () => {
    it('fetches members with phone field and normalizes to empty string', async () => {
      const userId = 'user-123'
      const circleId = 'circle-1'
      const mockData = [
        { friend_id: 'f1', friends: { id: 'f1', name: 'Alice', account: 'alice@ex', phone: '+15551234567' } },
        { friend_id: 'f2', friends: { id: 'f2', name: 'Bob', account: 'bob@ex', phone: null } },
      ]
      const chain = { eq: vi.fn() }
      chain.eq.mockReturnValueOnce(chain).mockResolvedValueOnce({ data: mockData, error: null })
      const select = vi.fn(() => chain)
      supabaseMock.from.mockReturnValue({ select })

      const members = await fetchCircleMembers(userId, circleId)

      expect(supabaseMock.from).toHaveBeenCalledWith('friend_circle_members')
      expect(select).toHaveBeenCalledWith('friend_id, friends:friends!friend_id(id, name, account, phone)')
      expect(chain.eq).toHaveBeenNthCalledWith(1, 'user_id', userId)
      expect(chain.eq).toHaveBeenNthCalledWith(2, 'circle_id', circleId)
      expect(members).toEqual([
        { id: 'f1', name: 'Alice', account: 'alice@ex', phone: '+15551234567' },
        { id: 'f2', name: 'Bob', account: 'bob@ex', phone: '' },
      ])
    })

    it('filters out null friend entries', async () => {
      const mockData = [
        { friend_id: 'f1', friends: { id: 'f1', name: 'Alice', account: 'a@ex', phone: '' } },
        { friend_id: 'f2', friends: null },
        { friend_id: 'f3', friends: { id: 'f3', name: 'Charlie', account: 'c@ex', phone: '+15559876543' } },
      ]
      const chain = { eq: vi.fn() }
      chain.eq.mockReturnValueOnce(chain).mockResolvedValueOnce({ data: mockData, error: null })
      const select = vi.fn(() => chain)
      supabaseMock.from.mockReturnValue({ select })

      const members = await fetchCircleMembers('user-1', 'circle-1')

      expect(members).toEqual([
        { id: 'f1', name: 'Alice', account: 'a@ex', phone: '' },
        { id: 'f3', name: 'Charlie', account: 'c@ex', phone: '+15559876543' },
      ])
    })

    it('returns empty array on error', async () => {
      const chain = { eq: vi.fn() }
      chain.eq.mockReturnValueOnce(chain).mockResolvedValueOnce({ data: null, error: new Error('db error') })
      const select = vi.fn(() => chain)
      supabaseMock.from.mockReturnValue({ select })

      const members = await fetchCircleMembers('user-1', 'circle-1')

      expect(members).toEqual([])
    })

    it('normalizes missing phone to empty string', async () => {
      const mockData = [
        { friend_id: 'f1', friends: { id: 'f1', name: 'Dave', account: null } },
      ]
      const chain = { eq: vi.fn() }
      chain.eq.mockReturnValueOnce(chain).mockResolvedValueOnce({ data: mockData, error: null })
      const select = vi.fn(() => chain)
      supabaseMock.from.mockReturnValue({ select })

      const members = await fetchCircleMembers('user-1', 'circle-1')

      expect(members).toEqual([
        { id: 'f1', name: 'Dave', account: null, phone: '' },
      ])
    })
  })

  describe('fetchCircleMemberCounts', () => {
    it('counts members per circle', async () => {
      const mockData = [
        { circle_id: 'c1' },
        { circle_id: 'c1' },
        { circle_id: 'c2' },
        { circle_id: 'c1' },
        { circle_id: 'c3' },
      ]
      const eq = vi.fn().mockResolvedValue({ data: mockData, error: null })
      const select = vi.fn(() => ({ eq }))
      supabaseMock.from.mockReturnValue({ select })

      const counts = await fetchCircleMemberCounts('user-1')

      expect(supabaseMock.from).toHaveBeenCalledWith('friend_circle_members')
      expect(select).toHaveBeenCalledWith('circle_id')
      expect(eq).toHaveBeenCalledWith('user_id', 'user-1')
      expect(counts).toEqual({ c1: 3, c2: 1, c3: 1 })
    })

    it('returns empty object on error', async () => {
      const eq = vi.fn().mockResolvedValue({ data: null, error: new Error('fail') })
      const select = vi.fn(() => ({ eq }))
      supabaseMock.from.mockReturnValue({ select })

      const counts = await fetchCircleMemberCounts('user-1')

      expect(counts).toEqual({})
    })

    it('handles empty member list', async () => {
      const eq = vi.fn().mockResolvedValue({ data: [], error: null })
      const select = vi.fn(() => ({ eq }))
      supabaseMock.from.mockReturnValue({ select })

      const counts = await fetchCircleMemberCounts('user-1')

      expect(counts).toEqual({})
    })
  })

  describe('createCircle', () => {
    it('creates a new circle and returns it', async () => {
      const userId = 'user-123'
      const circleName = 'Sports Team'
      const created = { id: 'c-new', user_id: userId, name: circleName }
      const select = vi.fn().mockResolvedValue({ data: [created], error: null })
      const insert = vi.fn(() => ({ select }))
      supabaseMock.from.mockReturnValue({ insert })

      const result = await createCircle(userId, circleName)

      expect(supabaseMock.from).toHaveBeenCalledWith('friend_circles')
      expect(insert).toHaveBeenCalledWith([{ user_id: userId, name: circleName }])
      expect(select).toHaveBeenCalled()
      expect(result).toEqual(created)
    })

    it('returns null when data is empty', async () => {
      const select = vi.fn().mockResolvedValue({ data: [], error: null })
      const insert = vi.fn(() => ({ select }))
      supabaseMock.from.mockReturnValue({ insert })

      const result = await createCircle('user-1', 'Test')

      expect(result).toBeNull()
    })

    it('throws when Supabase returns error', async () => {
      const error = new Error('insert failed')
      const select = vi.fn().mockResolvedValue({ data: null, error })
      const insert = vi.fn(() => ({ select }))
      supabaseMock.from.mockReturnValue({ insert })

      await expect(createCircle('user-1', 'Test')).rejects.toBe(error)
    })
  })

  describe('deleteCircle', () => {
    it('deletes a circle by id and user', async () => {
      const chain = { eq: vi.fn() }
      chain.eq.mockReturnValueOnce(chain).mockResolvedValueOnce({ error: null })
      const del = vi.fn(() => chain)
      supabaseMock.from.mockReturnValue({ delete: del })

      await deleteCircle('user-123', 'circle-1')

      expect(supabaseMock.from).toHaveBeenCalledWith('friend_circles')
      expect(del).toHaveBeenCalled()
      expect(chain.eq).toHaveBeenNthCalledWith(1, 'id', 'circle-1')
      expect(chain.eq).toHaveBeenNthCalledWith(2, 'user_id', 'user-123')
    })

    it('throws when Supabase returns error', async () => {
      const error = new Error('delete failed')
      const chain = { eq: vi.fn() }
      chain.eq.mockReturnValueOnce(chain).mockResolvedValueOnce({ error })
      const del = vi.fn(() => chain)
      supabaseMock.from.mockReturnValue({ delete: del })

      await expect(deleteCircle('user-1', 'circle-1')).rejects.toBe(error)
    })
  })

  describe('addCircleMember', () => {
    it('adds a friend to a circle', async () => {
      const insert = vi.fn().mockResolvedValue({ error: null })
      supabaseMock.from.mockReturnValue({ insert })

      await addCircleMember('user-123', 'circle-1', 'friend-5')

      expect(supabaseMock.from).toHaveBeenCalledWith('friend_circle_members')
      expect(insert).toHaveBeenCalledWith([
        { user_id: 'user-123', circle_id: 'circle-1', friend_id: 'friend-5' },
      ])
    })

    it('throws when Supabase returns error', async () => {
      const error = new Error('insert failed')
      const insert = vi.fn().mockResolvedValue({ error })
      supabaseMock.from.mockReturnValue({ insert })

      await expect(addCircleMember('user-1', 'c1', 'f1')).rejects.toBe(error)
    })
  })

  describe('removeCircleMember', () => {
    it('removes a friend from a circle', async () => {
      const chain = { eq: vi.fn() }
      chain.eq
        .mockReturnValueOnce(chain)
        .mockReturnValueOnce(chain)
        .mockResolvedValueOnce({ error: null })
      const del = vi.fn(() => chain)
      supabaseMock.from.mockReturnValue({ delete: del })

      await removeCircleMember('user-123', 'circle-1', 'friend-5')

      expect(supabaseMock.from).toHaveBeenCalledWith('friend_circle_members')
      expect(del).toHaveBeenCalled()
      expect(chain.eq).toHaveBeenNthCalledWith(1, 'user_id', 'user-123')
      expect(chain.eq).toHaveBeenNthCalledWith(2, 'circle_id', 'circle-1')
      expect(chain.eq).toHaveBeenNthCalledWith(3, 'friend_id', 'friend-5')
    })

    it('throws when Supabase returns error', async () => {
      const error = new Error('delete failed')
      const chain = { eq: vi.fn() }
      chain.eq
        .mockReturnValueOnce(chain)
        .mockReturnValueOnce(chain)
        .mockResolvedValueOnce({ error })
      const del = vi.fn(() => chain)
      supabaseMock.from.mockReturnValue({ delete: del })

      await expect(removeCircleMember('user-1', 'c1', 'f1')).rejects.toBe(error)
    })
  })
})
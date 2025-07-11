// Jest test setup file
import '@testing-library/jest-dom';

// Mock Supabase client
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: jest.fn()
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        order: jest.fn(),
        single: jest.fn(),
        or: jest.fn(),
        eq: jest.fn()
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn()
        }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn()
          }))
        }))
      })),
      delete: jest.fn(() => ({
        eq: jest.fn()
      }))
    })),
    auth: {
      getUser: jest.fn()
    }
  }
}));

// Mock React Router
jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/test' }),
  Link: ({ children, to }: any) => children
}));

// Mock window.performance
Object.defineProperty(window, 'performance', {
  value: {
    now: jest.fn(() => Date.now())
  }
});

// Mock file API
global.File = class MockFile {
  constructor(public content: any, public name: string, public options?: any) {}
  size = 1024;
  type = 'application/octet-stream';
} as any;

global.Blob = class MockBlob {
  constructor(public content: any, public options?: any) {}
  size = 1024;
  type = 'application/octet-stream';
} as any;

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-url');
global.URL.revokeObjectURL = jest.fn();
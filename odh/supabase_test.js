/**
 * Test file for SupabaseClient
 * 
 * This test file can be run with:
 * - Node.js: node supabase_test.js
 * - Jest: jest supabase_test.js
 * - Mocha: mocha supabase_test.js
 * 
 * For browser testing, include this file after supabase.js in an HTML file
 */

// Import SupabaseClient if using Node.js
if (typeof require !== 'undefined') {
    var SupabaseClient = require('./supabase.js');
}

// Simple test runner for standalone execution
class TestRunner {
    constructor() {
        this.tests = [];
        this.passed = 0;
        this.failed = 0;
    }

    test(name, fn) {
        this.tests.push({ name, fn });
    }

    async run() {
        console.log('Running SupabaseClient tests...\n');
        
        for (const { name, fn } of this.tests) {
            try {
                await fn();
                console.log(`✓ ${name}`);
                this.passed++;
            } catch (error) {
                console.error(`✗ ${name}`);
                console.error(`  Error: ${error.message}`);
                if (error.stack) {
                    console.error(`  Stack: ${error.stack.split('\n')[1]}`);
                }
                this.failed++;
            }
        }
        
        console.log(`\nTests: ${this.passed} passed, ${this.failed} failed`);
        return this.failed === 0;
    }
}

// Assertion helpers
function assert(condition, message) {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}

function assertEqual(actual, expected, message) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
}

function assertThrows(fn, errorMessage) {
    try {
        fn();
        throw new Error('Expected function to throw an error');
    } catch (error) {
        if (errorMessage && !error.message.includes(errorMessage)) {
            throw new Error(`Expected error message to include "${errorMessage}", got "${error.message}"`);
        }
    }
}

// Mock fetch for testing
let mockFetch = null;
let originalFetch = null;

function setupMockFetch() {
    if (typeof global !== 'undefined') {
        // Node.js environment
        originalFetch = global.fetch;
        global.fetch = mockFetch;
    } else if (typeof window !== 'undefined') {
        // Browser environment
        originalFetch = window.fetch;
        window.fetch = mockFetch;
    }
}

function restoreFetch() {
    if (typeof global !== 'undefined' && originalFetch) {
        global.fetch = originalFetch;
    } else if (typeof window !== 'undefined' && originalFetch) {
        window.fetch = originalFetch;
    }
}

// Test suite
const runner = new TestRunner();

// Test: Constructor
runner.test('Constructor should initialize with correct properties', () => {
    const client = new SupabaseClient('https://test.supabase.co', 'test-key');
    assert(client.supabaseUrl === 'https://test.supabase.co', 'URL should be set');
    assert(client.supabaseKey === 'test-key', 'Key should be set');
    assert(client.headers.apikey === 'test-key', 'Headers should include apikey');
    assert(client.headers.Authorization === 'Bearer test-key', 'Headers should include Authorization');
    assert(client.headers['Content-Type'] === 'application/json', 'Headers should include Content-Type');
});

// Test: buildUrl - basic select
runner.test('buildUrl should build basic select URL', () => {
    const client = new SupabaseClient('https://test.supabase.co', 'test-key');
    const url = client.buildUrl('trips', 'select');
    assert(url === 'https://test.supabase.co/rest/v1/trips', 'Should build basic select URL');
});

// Test: buildUrl - with filters
runner.test('buildUrl should include filters in query string', () => {
    const client = new SupabaseClient('https://test.supabase.co', 'test-key');
    const url = client.buildUrl('trips', 'select', { filters: { user_id: 1, status: 'active' } });
    assert(url.includes('user_id=eq.1'), 'Should include user_id filter');
    assert(url.includes('status=eq.active'), 'Should include status filter');
});

// Test: buildUrl - with select columns
runner.test('buildUrl should include select columns', () => {
    const client = new SupabaseClient('https://test.supabase.co', 'test-key');
    const url = client.buildUrl('trips', 'select', { select: 'id,name,date' });
    assert(url.includes('select=id,name,date'), 'Should include select parameter');
});

// Test: buildUrl - with ordering
runner.test('buildUrl should include order parameter', () => {
    const client = new SupabaseClient('https://test.supabase.co', 'test-key');
    const url = client.buildUrl('trips', 'select', { order: { column: 'date', direction: 'desc' } });
    assert(url.includes('order=date.desc'), 'Should include order parameter');
});

// Test: buildUrl - with limit
runner.test('buildUrl should include limit parameter', () => {
    const client = new SupabaseClient('https://test.supabase.co', 'test-key');
    const url = client.buildUrl('trips', 'select', { limit: 10 });
    assert(url.includes('limit=10'), 'Should include limit parameter');
});

// Test: buildUrl - with offset
runner.test('buildUrl should include offset parameter', () => {
    const client = new SupabaseClient('https://test.supabase.co', 'test-key');
    const url = client.buildUrl('trips', 'select', { offset: 20 });
    assert(url.includes('offset=20'), 'Should include offset parameter');
});

// Test: buildUrl - with all options
runner.test('buildUrl should combine all options correctly', () => {
    const client = new SupabaseClient('https://test.supabase.co', 'test-key');
    const url = client.buildUrl('trips', 'select', {
        filters: { user_id: 1 },
        select: 'id,name',
        order: { column: 'date', direction: 'asc' },
        limit: 5,
        offset: 10
    });
    assert(url.includes('user_id=eq.1'), 'Should include filter');
    assert(url.includes('select=id,name'), 'Should include select');
    assert(url.includes('order=date.asc'), 'Should include order');
    assert(url.includes('limit=5'), 'Should include limit');
    assert(url.includes('offset=10'), 'Should include offset');
});

// Test: read - success
runner.test('read should fetch data successfully', async () => {
    const mockData = [{ id: 1, name: 'Test Trip' }];
    mockFetch = async (url, options) => {
        assert(options.method === 'GET', 'Should use GET method');
        assert(options.headers.apikey, 'Should include apikey header');
        return {
            ok: true,
            json: async () => mockData
        };
    };
    setupMockFetch();
    
    const client = new SupabaseClient('https://test.supabase.co', 'test-key');
    const result = await client.read('trips');
    assertEqual(result, mockData, 'Should return mock data');
    
    restoreFetch();
});

// Test: read - error handling
runner.test('read should handle errors correctly', async () => {
    mockFetch = async () => {
        return {
            ok: false,
            statusText: 'Not Found',
            json: async () => ({ message: 'Table not found' })
        };
    };
    setupMockFetch();
    
    const client = new SupabaseClient('https://test.supabase.co', 'test-key');
    try {
        await client.read('nonexistent');
        assert(false, 'Should throw an error');
    } catch (error) {
        assert(error.message.includes('Supabase Error'), 'Should throw Supabase error');
    }
    
    restoreFetch();
});

// Test: query - with filters
runner.test('query should apply filters correctly', async () => {
    const mockData = [{ id: 1, user_id: 1, name: 'Test Trip' }];
    let capturedUrl = '';
    mockFetch = async (url, options) => {
        capturedUrl = url;
        return {
            ok: true,
            json: async () => mockData
        };
    };
    setupMockFetch();
    
    const client = new SupabaseClient('https://test.supabase.co', 'test-key');
    await client.query('trips', { user_id: 1, status: 'active' });
    assert(capturedUrl.includes('user_id=eq.1'), 'Should include user_id filter');
    assert(capturedUrl.includes('status=eq.active'), 'Should include status filter');
    
    restoreFetch();
});

// Test: query - with additional options
runner.test('query should combine filters with options', async () => {
    let capturedUrl = '';
    mockFetch = async (url, options) => {
        capturedUrl = url;
        return {
            ok: true,
            json: async () => []
        };
    };
    setupMockFetch();
    
    const client = new SupabaseClient('https://test.supabase.co', 'test-key');
    await client.query('trips', { user_id: 1 }, { limit: 10, order: { column: 'date', direction: 'desc' } });
    assert(capturedUrl.includes('user_id=eq.1'), 'Should include filter');
    assert(capturedUrl.includes('limit=10'), 'Should include limit');
    assert(capturedUrl.includes('order=date.desc'), 'Should include order');
    
    restoreFetch();
});

// Test: getById - success
runner.test('getById should return single record', async () => {
    const mockData = [{ id: 1, name: 'Test Trip' }];
    mockFetch = async () => {
        return {
            ok: true,
            json: async () => mockData
        };
    };
    setupMockFetch();
    
    const client = new SupabaseClient('https://test.supabase.co', 'test-key');
    const result = await client.getById('trips', 1);
    assertEqual(result, mockData[0], 'Should return first record');
    
    restoreFetch();
});

// Test: getById - not found
runner.test('getById should return null when not found', async () => {
    mockFetch = async () => {
        return {
            ok: true,
            json: async () => []
        };
    };
    setupMockFetch();
    
    const client = new SupabaseClient('https://test.supabase.co', 'test-key');
    const result = await client.getById('trips', 999);
    assert(result === null, 'Should return null for non-existent record');
    
    restoreFetch();
});

// Test: insert - success
runner.test('insert should create new record', async () => {
    const insertData = { name: 'New Trip', date: '2024-01-01' };
    const mockResponse = [{ id: 1, ...insertData }];
    let capturedBody = '';
    mockFetch = async (url, options) => {
        assert(options.method === 'POST', 'Should use POST method');
        assert(url.includes('/rest/v1/trips'), 'Should use correct endpoint');
        capturedBody = options.body;
        return {
            ok: true,
            json: async () => mockResponse
        };
    };
    setupMockFetch();
    
    const client = new SupabaseClient('https://test.supabase.co', 'test-key');
    const result = await client.insert('trips', insertData);
    assertEqual(JSON.parse(capturedBody), insertData, 'Should send correct data');
    assertEqual(result, mockResponse, 'Should return inserted record');
    
    restoreFetch();
});

// Test: insert - error handling
runner.test('insert should handle errors correctly', async () => {
    mockFetch = async () => {
        return {
            ok: false,
            statusText: 'Bad Request',
            json: async () => ({ message: 'Validation error' })
        };
    };
    setupMockFetch();
    
    const client = new SupabaseClient('https://test.supabase.co', 'test-key');
    try {
        await client.insert('trips', {});
        assert(false, 'Should throw an error');
    } catch (error) {
        assert(error.message.includes('Supabase Error'), 'Should throw Supabase error');
    }
    
    restoreFetch();
});

// Test: insertMany - success
runner.test('insertMany should create multiple records', async () => {
    const insertData = [
        { name: 'Trip 1', date: '2024-01-01' },
        { name: 'Trip 2', date: '2024-01-02' }
    ];
    const mockResponse = [
        { id: 1, ...insertData[0] },
        { id: 2, ...insertData[1] }
    ];
    let capturedBody = '';
    mockFetch = async (url, options) => {
        assert(options.method === 'POST', 'Should use POST method');
        capturedBody = options.body;
        return {
            ok: true,
            json: async () => mockResponse
        };
    };
    setupMockFetch();
    
    const client = new SupabaseClient('https://test.supabase.co', 'test-key');
    const result = await client.insertMany('trips', insertData);
    assertEqual(JSON.parse(capturedBody), insertData, 'Should send correct data array');
    assertEqual(result, mockResponse, 'Should return inserted records');
    
    restoreFetch();
});

// Test: update - success
runner.test('update should modify records', async () => {
    const updateData = { name: 'Updated Trip' };
    const mockResponse = [{ id: 1, ...updateData }];
    let capturedUrl = '';
    let capturedBody = '';
    mockFetch = async (url, options) => {
        assert(options.method === 'PATCH', 'Should use PATCH method');
        capturedUrl = url;
        capturedBody = options.body;
        return {
            ok: true,
            json: async () => mockResponse
        };
    };
    setupMockFetch();
    
    const client = new SupabaseClient('https://test.supabase.co', 'test-key');
    const result = await client.update('trips', { id: 1 }, updateData);
    assert(capturedUrl.includes('id=eq.1'), 'Should include filter in URL');
    assertEqual(JSON.parse(capturedBody), updateData, 'Should send correct update data');
    assertEqual(result, mockResponse, 'Should return updated record');
    
    restoreFetch();
});

// Test: update - multiple filters
runner.test('update should handle multiple filters', async () => {
    let capturedUrl = '';
    mockFetch = async (url, options) => {
        capturedUrl = url;
        return {
            ok: true,
            json: async () => []
        };
    };
    setupMockFetch();
    
    const client = new SupabaseClient('https://test.supabase.co', 'test-key');
    await client.update('trips', { user_id: 1, status: 'active' }, { name: 'Updated' });
    assert(capturedUrl.includes('user_id=eq.1'), 'Should include user_id filter');
    assert(capturedUrl.includes('status=eq.active'), 'Should include status filter');
    
    restoreFetch();
});

// Test: updateById - success
runner.test('updateById should update record by ID', async () => {
    const updateData = { name: 'Updated Trip' };
    let capturedUrl = '';
    mockFetch = async (url, options) => {
        capturedUrl = url;
        return {
            ok: true,
            json: async () => [{ id: 1, ...updateData }]
        };
    };
    setupMockFetch();
    
    const client = new SupabaseClient('https://test.supabase.co', 'test-key');
    await client.updateById('trips', 1, updateData);
    assert(capturedUrl.includes('id=eq.1'), 'Should include id filter');
    
    restoreFetch();
});

// Test: delete - success
runner.test('delete should remove records', async () => {
    const mockResponse = [{ id: 1, name: 'Deleted Trip' }];
    let capturedUrl = '';
    mockFetch = async (url, options) => {
        assert(options.method === 'DELETE', 'Should use DELETE method');
        capturedUrl = url;
        return {
            ok: true,
            json: async () => mockResponse
        };
    };
    setupMockFetch();
    
    const client = new SupabaseClient('https://test.supabase.co', 'test-key');
    const result = await client.delete('trips', { id: 1 });
    assert(capturedUrl.includes('id=eq.1'), 'Should include filter in URL');
    assertEqual(result, mockResponse, 'Should return deleted record');
    
    restoreFetch();
});

// Test: delete - multiple filters
runner.test('delete should handle multiple filters', async () => {
    let capturedUrl = '';
    mockFetch = async (url, options) => {
        capturedUrl = url;
        return {
            ok: true,
            json: async () => []
        };
    };
    setupMockFetch();
    
    const client = new SupabaseClient('https://test.supabase.co', 'test-key');
    await client.delete('trips', { user_id: 1, status: 'inactive' });
    assert(capturedUrl.includes('user_id=eq.1'), 'Should include user_id filter');
    assert(capturedUrl.includes('status=eq.inactive'), 'Should include status filter');
    
    restoreFetch();
});

// Test: deleteById - success
runner.test('deleteById should delete record by ID', async () => {
    let capturedUrl = '';
    mockFetch = async (url, options) => {
        capturedUrl = url;
        return {
            ok: true,
            json: async () => [{ id: 1 }]
        };
    };
    setupMockFetch();
    
    const client = new SupabaseClient('https://test.supabase.co', 'test-key');
    await client.deleteById('trips', 1);
    assert(capturedUrl.includes('id=eq.1'), 'Should include id filter');
    
    restoreFetch();
});

// Test: setCredentials
runner.test('setCredentials should update URL and key', () => {
    const client = new SupabaseClient('https://old.supabase.co', 'old-key');
    client.setCredentials('https://new.supabase.co', 'new-key');
    assert(client.supabaseUrl === 'https://new.supabase.co', 'Should update URL');
    assert(client.supabaseKey === 'new-key', 'Should update key');
    assert(client.headers.apikey === 'new-key', 'Should update apikey header');
    assert(client.headers.Authorization === 'Bearer new-key', 'Should update Authorization header');
});

// Run tests if executed directly
if (typeof require !== 'undefined' && require.main === module) {
    runner.run().then(success => {
        process.exit(success ? 0 : 1);
    });
} else if (typeof window !== 'undefined') {
    // Browser environment - expose runner for manual execution
    window.supabaseTestRunner = runner;
    console.log('Test runner available at window.supabaseTestRunner');
    console.log('Run tests with: window.supabaseTestRunner.run()');
}

// Export for use with testing frameworks
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TestRunner, runner, assert, assertEqual, assertThrows };
}


/**
 * Supabase Client for Trip Planner Database
 * 
 * Usage:
 *   const supabase = new SupabaseClient('YOUR_SUPABASE_URL', 'YOUR_SUPABASE_ANON_KEY');
 *   
 *   // Read data
 *   const trips = await supabase.read('trips');
 *   
 *   // Query with filters
 *   const userTrips = await supabase.query('trips', { user_id: 1 });
 *   
 *   // Insert data
 *   const newTrip = await supabase.insert('trips', { arrive_date: '2024-01-01', ... });
 *   
 *   // Update data
 *   const updated = await supabase.update('trips', { id: 1 }, { num_people: 3 });
 */

class SupabaseClient {
    constructor(supabaseUrl, supabaseKey) {
        this.supabaseUrl = supabaseUrl;
        this.supabaseKey = supabaseKey;
        this.headers = {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        };
    }

    /**
     * Build URL for Supabase REST API
     * @param {string} table - Table name
     * @param {string} operation - Operation type (select, insert, update, delete)
     * @param {Object} options - Query options (filters, order, limit, etc.)
     * @returns {string} - Full URL
     */
    buildUrl(table, operation = 'select', options = {}) {
        let url = `${this.supabaseUrl}/rest/v1/${table}`;
        
        if (operation === 'select') {
            const params = new URLSearchParams();
            
            // Add filters
            if (options.filters) {
                Object.entries(options.filters).forEach(([key, value]) => {
                    params.append(key, `eq.${value}`);
                });
            }
            
            // Add select columns
            if (options.select) {
                params.append('select', options.select);
            }
            
            // Add ordering
            if (options.order) {
                const orderBy = options.order.column || 'id';
                const orderDir = options.order.direction || 'asc';
                params.append('order', `${orderBy}.${orderDir}`);
            }
            
            // Add limit
            if (options.limit) {
                params.append('limit', options.limit);
            }
            
            // Add offset for pagination
            if (options.offset) {
                params.append('offset', options.offset);
            }
            
            const queryString = params.toString();
            if (queryString) {
                url += `?${queryString}`;
            }
        }
        
        return url;
    }

    /**
     * Read all data from a table
     * @param {string} table - Table name
     * @param {Object} options - Query options (select, order, limit, offset)
     * @returns {Promise<Array>} - Array of records
     */
    async read(table, options = {}) {
        try {
            const url = this.buildUrl(table, 'select', options);
            const response = await fetch(url, {
                method: 'GET',
                headers: this.headers
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`Supabase Error: ${error.message || response.statusText}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error(`Error reading from ${table}:`, error);
            throw error;
        }
    }

    /**
     * Query data with filters
     * @param {string} table - Table name
     * @param {Object} filters - Filter object (e.g., { user_id: 1, status: 'active' })
     * @param {Object} options - Additional query options (select, order, limit, offset)
     * @returns {Promise<Array>} - Array of matching records
     */
    async query(table, filters = {}, options = {}) {
        try {
            const queryOptions = {
                ...options,
                filters: filters
            };
            
            const url = this.buildUrl(table, 'select', queryOptions);
            const response = await fetch(url, {
                method: 'GET',
                headers: this.headers
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`Supabase Error: ${error.message || response.statusText}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error(`Error querying ${table}:`, error);
            throw error;
        }
    }

    /**
     * Get a single record by ID
     * @param {string} table - Table name
     * @param {number|string} id - Record ID
     * @param {Object} options - Query options (select)
     * @returns {Promise<Object|null>} - Single record or null
     */
    async getById(table, id, options = {}) {
        try {
            const filters = { id: id };
            const results = await this.query(table, filters, { ...options, limit: 1 });
            return results.length > 0 ? results[0] : null;
        } catch (error) {
            console.error(`Error getting ${table} by ID:`, error);
            throw error;
        }
    }

    /**
     * Insert a new record
     * @param {string} table - Table name
     * @param {Object} data - Data to insert
     * @returns {Promise<Array>} - Array containing the inserted record(s)
     */
    async insert(table, data) {
        try {
            const url = `${this.supabaseUrl}/rest/v1/${table}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`Supabase Error: ${error.message || response.statusText}`);
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error(`Error inserting into ${table}:`, error);
            throw error;
        }
    }

    /**
     * Insert multiple records
     * @param {string} table - Table name
     * @param {Array} dataArray - Array of data objects to insert
     * @returns {Promise<Array>} - Array containing the inserted records
     */
    async insertMany(table, dataArray) {
        try {
            const url = `${this.supabaseUrl}/rest/v1/${table}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify(dataArray)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`Supabase Error: ${error.message || response.statusText}`);
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error(`Error inserting multiple records into ${table}:`, error);
            throw error;
        }
    }

    /**
     * Update records
     * @param {string} table - Table name
     * @param {Object} filters - Filter object to identify records to update
     * @param {Object} data - Data to update
     * @returns {Promise<Array>} - Array containing the updated record(s)
     */
    async update(table, filters, data) {
        try {
            let url = `${this.supabaseUrl}/rest/v1/${table}`;
            
            // Build filter query string
            const params = new URLSearchParams();
            Object.entries(filters).forEach(([key, value]) => {
                params.append(key, `eq.${value}`);
            });
            
            if (params.toString()) {
                url += `?${params.toString()}`;
            }
            
            const response = await fetch(url, {
                method: 'PATCH',
                headers: this.headers,
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`Supabase Error: ${error.message || response.statusText}`);
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error(`Error updating ${table}:`, error);
            throw error;
        }
    }

    /**
     * Update a record by ID
     * @param {string} table - Table name
     * @param {number|string} id - Record ID
     * @param {Object} data - Data to update
     * @returns {Promise<Array>} - Array containing the updated record
     */
    async updateById(table, id, data) {
        return this.update(table, { id: id }, data);
    }

    /**
     * Delete records
     * @param {string} table - Table name
     * @param {Object} filters - Filter object to identify records to delete
     * @returns {Promise<Array>} - Array containing the deleted record(s)
     */
    async delete(table, filters) {
        try {
            let url = `${this.supabaseUrl}/rest/v1/${table}`;
            
            // Build filter query string
            const params = new URLSearchParams();
            Object.entries(filters).forEach(([key, value]) => {
                params.append(key, `eq.${value}`);
            });
            
            if (params.toString()) {
                url += `?${params.toString()}`;
            }
            
            const response = await fetch(url, {
                method: 'DELETE',
                headers: this.headers
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`Supabase Error: ${error.message || response.statusText}`);
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error(`Error deleting from ${table}:`, error);
            throw error;
        }
    }

    /**
     * Delete a record by ID
     * @param {string} table - Table name
     * @param {number|string} id - Record ID
     * @returns {Promise<Array>} - Array containing the deleted record
     */
    async deleteById(table, id) {
        return this.delete(table, { id: id });
    }

    /**
     * Sign up a new user
     * @param {string} email - User email
     * @param {string} password - User password
     * @param {Object} data - Additional user metadata
     * @returns {Promise<Object>} - The response data (including user and session)
     */
    async signUp(email, password, data = {}) {
        try {
            const url = `${this.supabaseUrl}/auth/v1/signup`;
            const response = await fetch(url, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify({
                    email,
                    password,
                    data
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`Supabase Auth Error: ${error.msg || error.message || response.statusText}`);
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Error signing up:', error);
            throw error;
        }
    }

    /**
     * Sign in with email and password
     * @param {string} email - User email
     * @param {string} password - User password
     * @returns {Promise<Object>} - The response data (including user and session)
     */
    async signIn(email, password) {
        try {
            const url = `${this.supabaseUrl}/auth/v1/token?grant_type=password`;
            const response = await fetch(url, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify({
                    email,
                    password
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`Supabase Auth Error: ${error.error_description || error.msg || error.message || response.statusText}`);
            }

            const result = await response.json();
            
            // Update Authorization header with the new access token
            if (result.access_token) {
                this.setAuthToken(result.access_token);
            }
            
            return result;
        } catch (error) {
            console.error('Error signing in:', error);
            throw error;
        }
    }

    /**
     * Sign out
     * @param {string} accessToken - The access token to invalidate (optional if already set in headers)
     */
    async signOut(accessToken) {
        try {
            const url = `${this.supabaseUrl}/auth/v1/logout`;
            const headers = { ...this.headers };
            if (accessToken) {
                headers['Authorization'] = `Bearer ${accessToken}`;
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: headers
            });

            if (!response.ok) {
                const error = await response.json();
                console.warn(`Supabase Logout Warning: ${error.msg || error.message || response.statusText}`);
            }

            // Reset Authorization header to anon key
            this.headers['Authorization'] = `Bearer ${this.supabaseKey}`;
        } catch (error) {
            console.error('Error signing out:', error);
            throw error;
        }
    }

    /**
     * Set the Authorization token for authenticated requests
     * @param {string} token - The access token
     */
    setAuthToken(token) {
        this.headers['Authorization'] = `Bearer ${token}`;
    }

    /**
     * Set new Supabase credentials
     * @param {string} supabaseUrl - New Supabase URL
     * @param {string} supabaseKey - New Supabase anon key
     */
    setCredentials(supabaseUrl, supabaseKey) {
        this.supabaseUrl = supabaseUrl;
        this.supabaseKey = supabaseKey;
        this.headers = {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        };
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SupabaseClient;
}


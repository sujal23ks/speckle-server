const appRoot = require( 'app-root-path' )
const knex = require( `${appRoot}/db/knex` )
const knexCleaner = require( 'knex-cleaner' )

exports.mochaHooks = {
  // async beforeEach( done ) {
  // do something before every test
  // done()
  // },
  async beforeAll( ) {
    await knex.migrate.rollback( )
    await knex.migrate.latest( )
    console.log( 'Done before all' )
  },
  async beforeEach ( ) {
    // console.log( 'Cleansing the DB ' )
    // await knexCleaner.clean( knex )
  },
  async afterAll( ) {
    console.log( 'Done after all' )
    await knex.migrate.rollback( )
    await knex.destroy( )
  }
}
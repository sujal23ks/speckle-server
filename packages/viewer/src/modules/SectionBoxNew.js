import * as THREE from 'three'
import SelectionHelper from './SelectionHelper'
import * as _ from './external/BufferGeometryToIndexed.js'
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js'
import { VertexNormalsHelper } from 'three/examples/jsm/helpers/VertexNormalsHelper.js'

export default class SectionBox {

  constructor( viewer, bbox ) {
    this.viewer = viewer

    this.viewer.renderer.localClippingEnabled = true

    this.orbiting = false
    this.dragging = false
    this.display = new THREE.Group()
    this.viewer.controls.addEventListener( 'wake', () => { this.orbiting = true } )
    this.viewer.controls.addEventListener( 'controlend', () => { this.orbiting = false } )

    // box
    this.boxGeometry = this._generateSimpleCube( 10, 10, 10 )
    // this.material = new THREE.MeshBasicMaterial()
    this.material = new THREE.MeshStandardMaterial( { color: 0x00ffff, opacity:0, wireframe: true, side: THREE.DoubleSide } )
    this.cube = new THREE.Mesh( this.boxGeometry, this.material )
    this.cube.visible = false

    this.viewer.scene.add( this.cube )

    this.boxHelper = new THREE.BoxHelper( this.cube, 0x0A66FF )
    this.viewer.scene.add( this.boxHelper )


    let sphere = new THREE.SphereGeometry( 0.01, 10, 10 )
    this.sphere = new THREE.Mesh( sphere, new THREE.MeshStandardMaterial( { color:0x00ffff } ) )
    this.viewer.scene.add( this.sphere )    

    // plane
    this.plane = new THREE.PlaneGeometry( 1, 1 )
    this.hoverPlane = new THREE.Mesh( this.plane, new THREE.MeshStandardMaterial( { transparent: true, side: THREE.DoubleSide, opacity: 0.2, color: 0x0A66FF, metalness: 0.1, roughness: 0.75 } ) )
    this.hoverPlane.visible = false
    this.viewer.scene.add( this.hoverPlane )

    window.cube = this.cube 

    // controls
    this.controls = new TransformControls( this.viewer.camera, this.viewer.renderer.domElement )
    this.viewer.scene.add( this.controls )

    this.controls.addEventListener( 'change', ( event ) => {
      this.viewer.needsRender = true
    } )

    this.controls.addEventListener( 'dragging-changed', ( event ) => {
      this.viewer.controls.enabled = !event.value
      this.viewer.interactions.preventSelection = !event.value
    } )

    this.selectionHelper = new SelectionHelper( this.viewer, { subset: this.cube, hover: true } )
    
    this.selectionHelper.on( 'hovered', args => {
      // console.log( args )
    } )

    this.dragging = false 

    let sidesSimple = {
      '013': { verts: [ 0, 1, 3, 2 ], axis:'z' },
      '312': { verts: [ 0, 1, 3, 2 ], axis:'z' },
      '152': { verts: [ 1, 2, 5, 6 ], axis:'x' },
      '256': { verts: [ 1, 2, 5, 6 ], axis:'x' },
      '546': { verts: [ 4, 5, 7, 6 ], axis:'z' },
      '647': { verts: [ 4, 5, 7, 6 ], axis:'z' },
      '407': { verts: [ 0, 3, 4, 7 ], axis:'x' },
      '703': { verts: [ 0, 3, 4, 7 ], axis:'x' },
      '327': { verts: [ 2, 3, 6, 7 ], axis:'y' },
      '726': { verts: [ 2, 3, 6, 7 ], axis:'y' },
      '450': { verts: [ 0, 1, 4, 5 ], axis:'y' },
      '051': { verts: [ 0, 1, 4, 5 ], axis:'y' }
    }

    this.sidesSimple = sidesSimple

    this._generatePlanes()
    // this.viewer.renderer.localClippingEnabled = true
    // this.viewer.renderer.clippingPlanes = this.planes

    this.controls.addEventListener( 'dragging-changed', ( event ) => {
      this.dragging = !!event.value
      this.viewer.interactions.preventSelection = this.dragging
    } )

    this.currentRange = null
    this.prevPosition = null

    this.controls.addEventListener( 'change', ( args ) => { 
      this.boxHelper.update()
      this._generatePlanes()

      // Dragging a side / plane
      if( this.dragging && this.currentRange ) {
        if( this.prevPosition === null ) this.prevPosition = this.hoverPlane.position.clone()
        this.prevPosition.sub( this.hoverPlane.position )
        this.prevPosition.negate()
        let boxArr = this.boxGeometry.attributes.position.array
        for( let i = 0; i < this.currentRange.length; i++ ) {
          let index = this.currentRange[i]
          boxArr[3 * index] += this.prevPosition.x
          boxArr[3 * index + 1] += this.prevPosition.y
          boxArr[3 * index + 2] += this.prevPosition.z
        }

        this.prevPosition = this.hoverPlane.position.clone()
        this.boxGeometry.attributes.position.needsUpdate = true
        this.boxGeometry.computeVertexNormals()
        this.boxGeometry.computeBoundingBox()
        this.boxGeometry.computeBoundingSphere()
      }

      // Dragging the whole section box
      if( this.dragging && !this.currentRange ) {
        if( this.prevPosition === null ) this.prevPosition = this.sphere.position.clone()
        this.prevPosition.sub( this.sphere.position )
        this.prevPosition.negate()

        for( let i = 0; i < this.boxGeometry.attributes.position.array.length; i += 3 ) {
          this.boxGeometry.attributes.position.array[i] += this.prevPosition.x
          this.boxGeometry.attributes.position.array[i + 1] += this.prevPosition.y
          this.boxGeometry.attributes.position.array[i + 2] += this.prevPosition.z
        }
        this.boxGeometry.attributes.position.needsUpdate = true
        this.boxGeometry.computeVertexNormals()
        this.boxGeometry.computeBoundingBox()
        this.boxGeometry.computeBoundingSphere()

        this.prevPosition = this.sphere.position.clone()
      }
      this.viewer.needsRender = true

    } )

    this.selectionHelper.on( 'object-clicked', args => {
      if( args.length === 0 && !this.dragging )  {
        this.controls.detach()

        let centre = new THREE.Vector3()
        let boxArr = this.boxGeometry.attributes.position.array
        for( let i = 0; i < boxArr.length; i += 3 ) {
          centre.add( new THREE.Vector3( boxArr[i], boxArr[i + 1], boxArr[i + 2] ) )
        }
        centre.multiplyScalar( 1 / 8 )
        this.sphere.position.copy( centre )


        this.cube.geometry.computeBoundingSphere()
        this.cube.geometry.computeBoundingBox()
        this.controls.attach( this.sphere )
        this.currentRange = null
        this.prevPosition = null
        this.hoverPlane.visible = false

        this.controls.showX = true
        this.controls.showY = true
        this.controls.showZ = true
        return
      }

      this.hoverPlane.visible = true
      let side = sidesSimple[`${args[0].face.a}${args[0].face.b}${args[0].face.c}`]
      this.controls.showX = side.axis === 'x'
      this.controls.showY = side.axis === 'y'
      this.controls.showZ = side.axis === 'z'

      this.currentRange = side.verts

      let boxArr = this.boxGeometry.attributes.position
      let index = 0
      let planeArr = this.plane.attributes.position.array
      let centre = new THREE.Vector3()
      
      let tempArr = []
      for( let i = 0; i < planeArr.length; i++ ) {
        if( i % 3 === 0 ) {
          tempArr.push( boxArr.getX( this.currentRange[index] ) )
        }
        else if( i % 3 === 1 ) {
          tempArr.push( boxArr.getY( this.currentRange[index] ) )
        }
        else if( i % 3 === 2 ) { 
          tempArr.push( boxArr.getZ( this.currentRange[index] ) )
          centre.add( new THREE.Vector3( tempArr[i - 2], tempArr[i - 1], tempArr[i] ) )
          index++
        }
      }

      centre.multiplyScalar( 0.25 )
      this.hoverPlane.position.copy( centre.applyMatrix4( this.cube.matrixWorld ) )
      this.prevPosition = this.hoverPlane.position.clone()
      index = 0
      for( let i = 0; i < planeArr.length; i++ ) {
        if( i % 3 === 0 ) {
          planeArr[i] = boxArr.getX( this.currentRange[index] ) - centre.x
        }
        else if( i % 3 === 1 ) {
          planeArr[i] = boxArr.getY( this.currentRange[index] ) - centre.y
        }
        else if( i % 3 === 2 ) { 
          planeArr[i] = boxArr.getZ( this.currentRange[index] ) - centre.z
          index++
        }
      }
    
      this.plane.applyMatrix4( this.cube.matrixWorld )
      this.plane.attributes.position.needsUpdate = true
      this.plane.computeBoundingSphere()
      this.plane.computeBoundingBox()
      this.controls.detach()
      this.controls.attach( this.hoverPlane )
      this.controls.updateMatrixWorld()
    } )
  }

  _generateSimpleCube( width = 0.5, depth = 0.5, height = 0.5 ) {
    const vertices = [
      [ -1 * width, -1 * depth, -1 * height ],
      [ 1 * width, -1 * depth, -1 * height ],
      [ 1 * width, 1 * depth, -1 * height ],
      [ -1 * width, 1 * depth, -1 * height ],
      [ -1 * width, -1 * depth, 1 * height ],
      [ 1 * width, -1 * depth, 1 * height ],
      [ 1 * width, 1 * depth, 1 * height ],
      [ -1 * width, 1 * depth, 1 * height ]
    ]

    const indexes = [
      0, 1, 3, 3, 1, 2,
      1, 5, 2, 2, 5, 6,
      5, 4, 6, 6, 4, 7,
      4, 0, 7, 7, 0, 3,
      3, 2, 7, 7, 2, 6,
      4, 5, 0, 0, 5, 1
    ]

    let positions = []
    for( let vert of vertices ) {
      positions.push( ...vert )
    }

    let g = new THREE.BufferGeometry()
    g.setAttribute( 'position', new THREE.BufferAttribute( new Float32Array( positions ), 3 ) )
    g.setIndex( indexes )
    g.computeVertexNormals()
    return g
  }

  _generatePlanes() {
    this.planes = this.planes || [ new THREE.Plane(), new THREE.Plane(), new THREE.Plane(), new THREE.Plane(), new THREE.Plane(), new THREE.Plane() ]
    this.helpers = this.helpers || [ new THREE.PlaneHelper( this.planes[0], 1, 0xffff00 ), new THREE.PlaneHelper( this.planes[1], 1, 0xffff00 ), new THREE.PlaneHelper( this.planes[2], 1, 0xffff00 ), new THREE.PlaneHelper( this.planes[3], 1, 0xffff00 ), new THREE.PlaneHelper( this.planes[4], 1, 0xffff00 ), new THREE.PlaneHelper( this.planes[5], 1, 0xffff00 ) ]

    if( !this.helpersAdded ) {
      this.helpers.forEach( helper => this.viewer.scene.add( helper ) )
      this.helpersAdded = true
    } else {
      // this.helpers.forEach( helper => helper.update() )
    }

    let keys = [ '013', '152', '546', '407', '327', '450' ]
    let index = 0
    let boxArr = this.boxGeometry.attributes.position
    for( let key of keys ) {
      let side = this.sidesSimple[key]
      let verts = side.verts
      let plane = this.planes[index]
      let pts = []
      
      for( let i = 0; i < 3; i++ ) {
        pts.push( new THREE.Vector3( boxArr.getX( verts[i] ), boxArr.getY( verts[i] ), boxArr.getZ( verts[i] ) ) )
      }

      plane.setFromCoplanarPoints( pts[1], pts[0], pts[2] )

      index++
    }
  }

  setPlanesFromBox( box ) {
    
  }

  setBox( box ) {
    
  }

  toggle() {
    
  }

  dispose() {
    
  }
}

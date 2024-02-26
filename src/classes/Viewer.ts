import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';
import { VertexNormalsHelper } from 'three/examples/jsm/helpers/VertexNormalsHelper';

export interface MatrixHelpers {
  position: THREE.Vector3;
  rotation: THREE.Quaternion;
  scale: THREE.Vector3;
}

const UP_VEC = new THREE.Vector3(0, 1, 0);

export class Viewer {
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private readonly scene: THREE.Scene;

  private readonly canvasSize: THREE.Vector2;
  private readonly renderSize: THREE.Vector2;

  private readonly dirLight: THREE.DirectionalLight;

  private readonly cubeRT: THREE.WebGLCubeRenderTarget;
  private readonly cubeMaterial: THREE.MeshBasicMaterial;
  private readonly cubeMesh: THREE.Mesh;
  private readonly cubeScene: THREE.Scene;
  private readonly cubeCamera: THREE.CubeCamera;

  constructor(private readonly renderer: THREE.WebGLRenderer, private readonly canvas: HTMLCanvasElement) {
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(75, this.canvas.clientWidth / this.canvas.clientHeight);
    this.camera.position.set(0, 2, 3);
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.target.set(0, 0.5, 0);

    this.canvasSize = new THREE.Vector2(this.canvas.clientWidth, this.canvas.clientHeight);
    this.renderSize = new THREE.Vector2();

    this.dirLight = new THREE.DirectionalLight(undefined, 0.75);

    //this.scene.add(this.dirLight);

    // Set up cube stuff so we can rotate the envmap...
    this.cubeRT = new THREE.WebGLCubeRenderTarget(256, { type: THREE.FloatType });
    this.cubeScene = new THREE.Scene();
    this.cubeCamera = new THREE.CubeCamera(0.1, 100, this.cubeRT);
    this.cubeMaterial = new THREE.MeshBasicMaterial({ side: THREE.BackSide });
    this.cubeMesh = new THREE.Mesh(new THREE.SphereGeometry(1), this.cubeMaterial);
    this.cubeMesh.frustumCulled = false;
    this.cubeScene.add(this.cubeMesh);

    this.scene.environment = this.cubeRT.texture;

    this.loadEnvMap();
    this.setupScene();
  }

  readonly update = (dt: number) => {
    this.controls.update();

    this.canvasSize.set(this.canvas.clientWidth, this.canvas.clientHeight);

    // Resize renderer
    if (!this.canvasSize.equals(this.renderSize)) {
      this.renderer.setSize(this.canvasSize.x, this.canvasSize.y, false);
      this.camera.aspect = this.canvasSize.x / this.canvasSize.y;
      this.camera.updateProjectionMatrix();
    }

    this.cubeMesh.rotation.y += 0.5 * dt;
    this.cubeCamera.update(this.renderer, this.cubeScene);

    // const elapsed = performance.now() * 0.001;
    // this.dirLight.position.set(Math.sin(elapsed), 1, Math.cos(elapsed)).normalize();

    this.renderer.render(this.scene, this.camera);
  };

  private loadEnvMap() {
    const loader = new RGBELoader();

    loader.load('./assets/studio.hdr', tex => {
      tex.mapping = THREE.EquirectangularReflectionMapping;
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;

      //this.scene.environment = tex;
      this.cubeMaterial.map = tex;
      this.cubeMaterial.needsUpdate = true;
    });
  }

  private setupScene() {
    const loader = new FBXLoader();

    //const promises = [loader.loadAsync('./assets/box_1.fbx'), loader.loadAsync('./assets/box_2.fbx')];
    //const promises = [loader.loadAsync('./assets/pipe_1.fbx'), loader.loadAsync('./assets/pipe_2.fbx')];
    const promises = [loader.loadAsync('./assets/container_1.fbx'), loader.loadAsync('./assets/container_2.fbx')];

    let i = 0;
    const material = new THREE.MeshPhysicalMaterial({
      roughness: 0.2,
      color: 0xcccccc,
      metalness: 1,
      envMapIntensity: 1,
    });
    const wireframeMat = new THREE.MeshBasicMaterial({ wireframe: true });
    Promise.all(promises).then(promises => {
      for (const group of promises) {
        const mesh = group.children[0].clone() as THREE.Mesh;

        this.scene.add(mesh);
        mesh.position.x = -0.75 + i * 1.5;
        mesh.position.z = 1;
        mesh.position.y = 0.0;
        i++;

        mesh.material = material;

        // Clone for showing wireframes
        const wireframeMesh = mesh.clone();
        wireframeMesh.position.z = -1;
        wireframeMesh.material = wireframeMat;
        this.scene.add(wireframeMesh);

        const normalsHelper = new VertexNormalsHelper(wireframeMesh, 0.1);
        this.scene.add(normalsHelper);
      }
    });
  }
}

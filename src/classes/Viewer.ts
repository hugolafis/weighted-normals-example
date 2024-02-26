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

  constructor(private readonly renderer: THREE.WebGLRenderer, private readonly canvas: HTMLCanvasElement) {
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(75, this.canvas.clientWidth / this.canvas.clientHeight);
    this.camera.position.set(0, 1, 2);
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.target.set(0, 0.5, 0);

    this.canvasSize = new THREE.Vector2(this.canvas.clientWidth, this.canvas.clientHeight);
    this.renderSize = new THREE.Vector2();

    this.scene.add(new THREE.AmbientLight());

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

    this.renderer.render(this.scene, this.camera);
  };

  private loadEnvMap() {
    const loader = new RGBELoader();

    loader.load('./assets/envMap.hdr', tex => {
      tex.mapping = THREE.EquirectangularReflectionMapping;
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;

      this.scene.environment = tex;
    });
  }

  private setupScene() {
    const loader = new FBXLoader();

    const promises = [loader.loadAsync('./assets/box_1.fbx'), loader.loadAsync('./assets/box_2.fbx')];

    let i = 0;
    const material = new THREE.MeshPhysicalMaterial({ roughness: 0.5, color: 0xcccccc, metalness: 1 });
    const wireframeMat = new THREE.MeshBasicMaterial({ wireframe: true });
    Promise.all(promises).then(promises => {
      for (const group of promises) {
        const mesh = group.children[0].clone() as THREE.Mesh;

        this.scene.add(mesh);
        mesh.position.x = -2 + i * 2;
        mesh.position.z = 2;
        mesh.position.y = 0.0;
        i++;

        mesh.scale.multiplyScalar(0.01);
        mesh.material = material;
        const vertices = mesh.geometry.getAttribute('position');
        console.log(vertices);

        console.log(mesh.name);

        // Clone for showing wireframes
        const wireframeMesh = mesh.clone();
        wireframeMesh.position.z = -2;
        wireframeMesh.material = wireframeMat;
        this.scene.add(wireframeMesh);

        const normalsHelper = new VertexNormalsHelper(wireframeMesh, 0.1);
        this.scene.add(normalsHelper);
      }
    });
  }
}

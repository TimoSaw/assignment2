import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import GUI from 'lil-gui';


let camera, scene, renderer, raycaster, controls;
const cylinders = [];
const mouse = new THREE.Vector2();
let sphere;

const parameters = {
  cylinderLength: 10,
  numberOfCylinders: 2
};

function main() {
  const gui = new GUI();

  gui.add(parameters, 'cylinderLength', 1, 50, 1).name('Cylinder Length').onChange((value) => {
    cylinders.forEach(cylinder => {
      const directionToSphere = new THREE.Vector3().copy(sphere.position).sub(cylinder.position).normalize();
      const heightChange = value - cylinder.geometry.parameters.height;
      const newHeight = Math.max(0, heightChange * directionToSphere.dot(cylinder.up));

      const currentPosition = cylinder.position.clone();
      const newPosition = currentPosition.clone().add(directionToSphere.clone().multiplyScalar(newHeight));

      cylinder.geometry.dispose();
      cylinder.geometry = new THREE.CylinderGeometry(1, 1, value, 16);
      cylinder.position.copy(newPosition);
    });
  });

  gui.add(parameters, 'numberOfCylinders', 2, 10, 1).name('Number of Cylinders').onChange((value) => {
    updateNumberOfCylinders(value);
  });

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 1000);
  camera.position.set(0, 0, 75);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(0, 1, 1);
  scene.add(directionalLight);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  raycaster = new THREE.Raycaster();

  controls = new OrbitControls(camera, renderer.domElement);
  controls.update();

  window.addEventListener('resize', onWindowResize);
  document.addEventListener('click', onClick);

  const sphereGeometry = new THREE.SphereGeometry(30, 16, 8);
  const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
  sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  sphere.position.set(0, 0, 0);
  scene.add(sphere);

  for (let i = 0; i < parameters.numberOfCylinders; i++) {
    addCylinder();
  }

  animate();
}

function addCylinder() {
  const randomPoint = getRandomPointOnSphere(sphere);
  const direction = new THREE.Vector3().copy(randomPoint).sub(sphere.position);
  const cylinderGeometry = new THREE.CylinderGeometry(1, 1, parameters.cylinderLength, 16);
  const cylinderMaterial = new THREE.MeshPhysicalMaterial({ color: 0xff0000 });
  const cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
  cylinder.position.set(0, 0, 0);
  cylinder.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  cylinder.position.add(direction.clone().multiplyScalar(parameters.cylinderLength / 2));
  cylinder.velocity = new THREE.Vector3(0, 0, 0.1);
  scene.add(cylinder);
  cylinders.push(cylinder);
}

function removeCylinder() {
  if (cylinders.length > 0) {
    const cylinder = cylinders.pop();
    scene.remove(cylinder);
  }
}

function updateNumberOfCylinders(num) {
  const currentCylinderCount = cylinders.length;

  if (num > currentCylinderCount) {
    for (let i = 0; i < num - currentCylinderCount; i++) {
      addCylinder();
    }
  } else if (num < currentCylinderCount) {
    for (let i = 0; i < currentCylinderCount - num; i++) {
      removeCylinder();
    }
  }
}

function getRandomPointOnSphere(sphere) {
  const phi = Math.random() * Math.PI * 2;
  const theta = Math.acos(Math.random() * 2 - 1);
  const x = Math.sin(theta) * Math.cos(phi);
  const y = Math.sin(theta) * Math.sin(phi);
  const z = Math.cos(theta);
  return new THREE.Vector3(x, y, z).multiplyScalar(sphere.geometry.parameters.radius).add(sphere.position);
}

function onClick(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObjects(cylinders);

  intersects.forEach(intersection => {
    intersection.object.material.color.setHex(0xff0000);
  });
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  controls.update();
}

function animate() {
  requestAnimationFrame(animate);

  cylinders.forEach(cylinder => {
    const direction = new THREE.Vector3(0, 1, 0).applyQuaternion(cylinder.quaternion);
    const velocity = direction.clone().multiplyScalar(cylinder.velocity.z);
    cylinder.position.add(velocity);

    // Detect intersection with other cylinders
    cylinders.forEach(otherCylinder => {
      if (cylinder !== otherCylinder) {
        const distance = cylinder.position.distanceTo(otherCylinder.position);
        const minDistance = (cylinder.geometry.parameters.height + otherCylinder.geometry.parameters.height) / 2;
        if (distance < minDistance) {
          // Move the cylinders slightly apart to avoid sticking
          const moveDistance = minDistance - distance;
          const moveDirection = cylinder.position.clone().sub(otherCylinder.position).normalize();
          const moveVector = moveDirection.clone().multiplyScalar(moveDistance / 2);
          cylinder.position.add(moveVector);
          otherCylinder.position.sub(moveVector);

          // Change direction upon intersection
          cylinder.velocity.z *= -1;
          otherCylinder.velocity.z *= -1;
        }
      }
    });

    // Detect intersection with the sphere
    const end1 = cylinder.position.clone().add(direction.clone().multiplyScalar(cylinder.geometry.parameters.height / 2));
    const end2 = cylinder.position.clone().add(direction.clone().multiplyScalar(-cylinder.geometry.parameters.height / 2));
    const sphereRadius = sphere.geometry.parameters.radius;
    const distance1 = end1.distanceTo(sphere.position);
    const distance2 = end2.distanceTo(sphere.position);
    if (distance1 > sphereRadius || distance2 > sphereRadius) {
      cylinder.velocity.z *= -1;
    }
  });

  renderer.render(scene, camera);
  controls.update();
}




main();

function checkForIntersections() {
  for (let i = 0; i < cylinders.length; i++) {
      for (let j = i + 1; j < cylinders.length; j++) {
          cylinders[i].userData.obb = new OBB();
          cylinders[j].userData.obb = new OBB();

          cylinders[i].updateMatrix();
          cylinders[i].updateMatrixWorld();
          cylinders[i].userData.obb.copy(cylinders[i].geometry.userData.obb);
          cylinders[i].userData.obb.applyMatrix4(cylinders[i].matrixWorld);

          cylinders[j].updateMatrix();
          cylinders[j].updateMatrixWorld();
          cylinders[j].userData.obb.copy(cylinders[j].geometry.userData.obb);
          cylinders[j].userData.obb.applyMatrix4(cylinders[j].matrixWorld);

          const obb1 = cylinders[i].userData.obb;
          const obb2 = cylinders[j].userData.obb;

          if (obb1.intersectsOBB(obb2)) {
              console.log(`Intersection detected between Cylinder ${i} and Cylinder ${j}`);
          } else {
              console.log(`No intersection detected between Cylinder ${i} and Cylinder ${j}`);
          }
      }
  }
}
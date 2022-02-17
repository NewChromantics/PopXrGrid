import Pop from './PopEngine/PopEngine.js'
import FrameCounter_t from './PopEngine/FrameCounter.js'

import Camera_t from './PopEngine/Camera.js'
import AssetManager from './PopEngine/AssetManager.js'
import {CreateCubeGeometry} from './PopEngine/CommonGeometry.js'
import {CreateTranslationMatrix,Add3,Subtract3,Multiply3} from './PopEngine/Math.js'
import {CreateRandomImage} from './PopEngine/Images.js'
import {GetRandomColour} from './PopEngine/Colour.js'
import {Dot3,lerp,LengthSq3} from './PopEngine/Math.js'

let AppCamera = new Camera_t();
//	try and emulate default XR pose a bit
AppCamera.Position = [0,0,0];
AppCamera.LookAt = [0,0,-1];
let LastXrRenderTimeMs = null;
let DefaultDepthTexture = CreateRandomImage(16,16);
let CubePosition = AppCamera.LookAt.slice();
let CubeSize = 0.02;



async function CreateUnitCubeTriangleBuffer(RenderContext)
{
	const Geometry = CreateCubeGeometry(-CubeSize,CubeSize);
	const TriangleIndexes = undefined;
	const TriBuffer = await RenderContext.CreateGeometry(Geometry,TriangleIndexes);
	return TriBuffer;
}


let CubeShader = null;
function RegisterAssets()
{
	if ( CubeShader )
		return;
	AssetManager.RegisterAssetAsyncFetchFunction('Cube01', CreateUnitCubeTriangleBuffer );


	const Attribs = ['LocalPosition','LocalUv'];
	const VertFilename = 'Geo.vert.glsl';
	const FragFilename = 'Colour.frag.glsl';
	CubeShader = AssetManager.RegisterShaderAssetFilename(FragFilename,VertFilename,null,Attribs);
}


const CubeCount = 1000;
function GetPositionN(xyz,Index)
{
	const Div = Math.floor(Math.cbrt(CubeCount));
	let x = (Index % Div);
	let y = Math.floor( (Index % (Div*Div)) / Div );
	let z = Math.floor( Index / (Div*Div) );

	x -= Div/2;
	y -= Div/2;
	z -= Div/2;
	x *= CubeSize*2.5;
	y *= CubeSize*2.5;
	z *= CubeSize*2.5;
	x += xyz[0];
	y += xyz[1];
	z += xyz[2];
	//return CreateTranslationMatrix(x,y,z);
	return [x,y,z];
}
function GetColourN(xyz,Index)
{
	return GetRandomColour();
	const r = lerp( 0.4, 0.9, Math.random() );
	const b = lerp( 0.4, 0.9, Math.random() );
	const g = lerp( 0.4, 0.9, Math.random() );
	return [r,g,b];
}

//const LocalToWorldTransforms = new Float32Array( new Array(CubeCount).fill(CubePosition.slice()).map( GetPositionN ).flat(2) );
const WorldPositions = new Array(CubeCount).fill(CubePosition.slice()).map( GetPositionN );
const Colours = new Float32Array( new Array(WorldPositions.length).fill(0).map( GetColourN ).flat(2) );

function GetSceneRenderCommands(RenderContext,Camera,Viewport=[0,0,1,1])
{
	//	make screen camera track xr camera
	AppCamera.Position = Camera.Position.slice();
	AppCamera.LookAt = Camera.LookAt.slice();
	
	RegisterAssets();
	
	const ClearCommand = ['SetRenderTarget',null,[0.1,0.1,0.1]];
			
	//	normalise viewport
	Viewport[0] = 0;
	Viewport[1] = 0;
	Viewport[3] /= Viewport[2];
	Viewport[2] /= Viewport[2];

	let InFrontMetres = 1.0;
	let Forward = Multiply3( Camera.GetForward(), [InFrontMetres,InFrontMetres,InFrontMetres] );
	let CubePosition = Add3( Camera.Position, Forward );

	//	todo; store distance from camera?... use w? and a version?...or map once and sort?
	const CameraPos = AppCamera.Position;
	function CompareNearCamera(a,b)
	{
		const Dista = LengthSq3(a,CameraPos);
		const Distb = LengthSq3(b,CameraPos);
		if ( Dista < Distb )	return 1;
		if ( Dista > Distb )	return -1;
		return 0;
	}
	//WorldPositions.sort(CompareNearCamera);

	const Geo = AssetManager.GetAsset('Cube01',RenderContext);
	const Shader = AssetManager.GetAsset(CubeShader,RenderContext);
	const Uniforms = {};
	//Uniforms.LocalToWorldTransform = LocalToWorldTransforms;
	Uniforms.WorldPosition = WorldPositions;
	Uniforms.Colour = Colours;
	Uniforms.WorldToCameraTransform = Camera.GetWorldToCameraMatrix();
	Uniforms.CameraToWorldTransform = Camera.GetLocalToWorldMatrix();
	Uniforms.CameraProjectionTransform = Camera.GetProjectionMatrix(Viewport);
	Uniforms.DepthTexture = Camera.DepthImage || DefaultDepthTexture;
	Uniforms.NormalDepthToViewDepthTransform = Uniforms.DepthTexture.NormalDepthToViewDepthTransform || [];
	
	const State = {};
	State.BlendMode = 'Alpha';
	State.BlendMode = 'Blit';
	//State.DepthRead = false;
	
	const DrawCube = ['Draw',Geo,Shader,Uniforms,State];
	/*
	const Uniforms2 = Object.assign({},Uniforms);
	Uniforms2.LocalToWorldTransform = CreateTranslationMatrix( CubePosition[0]+1, CubePosition[1], CubePosition[2] );
	Uniforms2.Colour = [0,1,0];
	const DrawCube2 = ['Draw',Geo,Shader,Uniforms2];
	*/
	
	return [ClearCommand,DrawCube/*,DrawCube2*/];
}

function GetXrRenderCommands()
{
	LastXrRenderTimeMs = Pop.GetTimeNowMs();
	return GetSceneRenderCommands(...arguments);
}

async function GetMainRenderCommands(RenderView,RenderContext)
{
	let Camera = AppCamera;

	try
	{
		const Viewport = RenderView.GetScreenRect();
		const Commands = GetSceneRenderCommands(RenderContext,Camera,Viewport);
		return Commands;
	}
	catch(e)
	{
		console.error(e);
		const ClearRed = ['SetRenderTarget',null,[1,0,0]];
		return [ClearRed];
	}
}



async function XrLoop(RenderContext,XrOnWaitForCallback)
{
	const FrameCounter = new FrameCounter_t(`XR frame`);
	function OnXrRender()
	{
		FrameCounter.Add();
	}
	

	while ( true )
	{
		try
		{
			LastXrRenderTimeMs = null;
			const Device = await Pop.Xr.CreateDevice( RenderContext, GetXrRenderCommands, XrOnWaitForCallback );
			//	this needs updating
			Device.OnRender = OnXrRender;
			await Device.WaitForEnd();
		}
		catch(e)
		{
			console.error(`Failed to create xr ${e}`);
			await Pop.Yield(1*1000);
		}
	}
}

function BindMouseCameraControls(Camera,RenderView)
{
	RenderView.OnMouseDown = function(x,y,Button,FirstDown=true)
	{
		if ( Button == 'Left' )
			Camera.OnCameraOrbit( x, y, 0, FirstDown!=false );
		if ( Button == 'Right' )
			Camera.OnCameraPan( x, y, 0, FirstDown!=false );
	}
	
	RenderView.OnMouseMove = function(x,y,Button)
	{
		RenderView.OnMouseDown( x, y, Button, false );
	}
	
	RenderView.OnMouseScroll = function(x,y,Button,Delta)
	{
		Camera.OnCameraZoom( -Delta[1] * 0.1 );
	}
}

async function RenderLoop(Canvas,XrOnWaitForCallback)
{
	const RenderView = new Pop.Gui.RenderView(null,Canvas);
	const RenderContext = new Pop.Sokol.Context(RenderView);
	
	BindMouseCameraControls( AppCamera, RenderView );
	
	if ( XrOnWaitForCallback )
		XrLoop(RenderContext,XrOnWaitForCallback).catch(console.error);
	
	const FrameCounter = new FrameCounter_t(`Render`);
	
	while ( RenderView )
	{
		const Commands = await GetMainRenderCommands(RenderView,RenderContext);
		await RenderContext.Render(Commands);
		FrameCounter.Add();

		//	only intermediately render if xr is running
		//	todo: check time since render and "turn on" again if we havent XR rendered for a while
		if ( LastXrRenderTimeMs )
			await Pop.Yield(10*1000);
	}
}


export default async function Bootup(XrOnWaitForCallback)
{
	await RenderLoop('Window',XrOnWaitForCallback);
}

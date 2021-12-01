import Pop from './PopEngine/PopEngine.js'
import FrameCounter_t from './PopEngine/FrameCounter.js'



function GetSceneRenderCommands(Camera)
{
	//	draw cube etc
	return [];
}

async function GetMainRenderCommands(RenderContext)
{
	const SetRenderTarget = ['SetRenderTarget',null,[1,1,0]];

	let Camera = null;

	const Commands = [ SetRenderTarget ];
	Commands.push( ...GetSceneRenderCommands(Camera) );
	
	return Commands;
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
			const Device = await Pop.Xr.CreateDevice( RenderContext, GetSceneRenderCommands, XrOnWaitForCallback );
			//	this needs updating
			Device.OnRender = OnXrRender;
		}
		catch(e)
		{
			console.error(`Failed to create xr ${e}`);
			await Pop.Yield(1*1000);
		}
	}
}

async function RenderLoop(Canvas,XrOnWaitForCallback)
{
	const RenderView = new Pop.Gui.RenderView(null,Canvas);
	const RenderContext = new Pop.Sokol.Context(RenderView);
	
	if ( XrOnWaitForCallback )
		XrLoop(RenderContext,XrOnWaitForCallback).catch(console.error);
	
	const FrameCounter = new FrameCounter_t(`Render`);
	
	while ( RenderView )
	{
		const Commands = await GetMainRenderCommands(RenderContext);
		await RenderContext.Render(Commands);
		FrameCounter.Add();
	}
}


export default async function Bootup(XrOnWaitForCallback)
{
	await RenderLoop('Window',XrOnWaitForCallback);
}

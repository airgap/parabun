import * as $ from 'svelte/internal/server';

export default function Main($$renderer) {
	let activeTab = 0;
	let activeHeading;

	$: console.log(activeHeading);

	$$renderer.push(`<div class="tabs"><div class="tab-toggles"><button${$.attr_class('', void 0, { 'active': activeTab === 0 })}>Tab 1</button> <button${$.attr_class('', void 0, { 'active': activeTab === 1 })}>Tab 2</button> <button${$.attr_class('', void 0, { 'active': activeTab === 2 })}>Tab 3</button></div> <div class="tab-content">`);

	if (activeTab === 0) {
		$$renderer.push('<!--[0-->');
		$$renderer.push(`<div><h1>Tab 1</h1></div>`);
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]--> `);

	if (activeTab === 1) {
		$$renderer.push('<!--[0-->');
		$$renderer.push(`<div><h1>Tab 2</h1></div>`);
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]--> `);

	if (activeTab === 2) {
		$$renderer.push('<!--[0-->');
		$$renderer.push(`<div><h1>Tab 3</h1></div>`);
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]--></div> <duiv></duiv></div>`);
}
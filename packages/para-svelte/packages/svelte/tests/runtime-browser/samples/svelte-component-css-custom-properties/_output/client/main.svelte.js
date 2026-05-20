import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Slider1 from './Slider1.svelte';
import Slider2 from './Slider2.svelte';

var root = $.from_html(`<svelte-css-wrapper style="display: contents"><!></svelte-css-wrapper> <svelte-css-wrapper style="display: contents"><!></svelte-css-wrapper>`, 1);

export default function _unknown_($$anchor, $$props) {
	$.push($$props, false);

	const slider = $.mutable_source();
	let componentName = $.prop($$props, 'componentName', 12, 'Slider1');

	$.legacy_pre_effect(() => ($.deep_read_state(componentName()), Slider1, Slider2), () => {
		$.set(slider, componentName() === 'Slider1'
			? Slider1
			: componentName() === 'Slider2' ? Slider2 : undefined);
	});

	$.legacy_pre_effect_reset();

	var $$exports = {
		get componentName() {
			return componentName();
		},

		set componentName($$value) {
			componentName($$value);
			$.flush();
		}
	};

	var fragment = root();
	var node = $.first_child(fragment);

	{
		$.css_props(node, () => ({
			'--rail-color': 'rgb(0, 0, 0)',
			'--track-color': 'rgb(255, 0, 0)'
		}));

		$.component(node.lastChild, () => $.get(slider), ($$anchor, $$component) => {
			$$component($$anchor, { id: 'component1' });
		});

		$.reset(node);
	}

	var node_1 = $.sibling(node, 2);

	{
		$.css_props(node_1, () => ({
			'--rail-color': 'rgb(0, 255, 0)',
			'--track-color': 'rgb(0, 0, 255)'
		}));

		$.component(node_1.lastChild, () => $.get(slider), ($$anchor, $$component) => {
			$$component($$anchor, { id: 'component2' });
		});

		$.reset(node_1);
	}

	$.append($$anchor, fragment);

	return $.pop($$exports);
}
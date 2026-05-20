import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<div><h1>Tab 1</h1></div>`);
var root_2 = $.from_html(`<div><h1>Tab 2</h1></div>`);
var root_3 = $.from_html(`<div><h1>Tab 3</h1></div>`);
var root = $.from_html(`<div class="tabs"><div class="tab-toggles"><button>Tab 1</button> <button>Tab 2</button> <button>Tab 3</button></div> <div class="tab-content"><!> <!> <!></div> <duiv></duiv></div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let activeTab = $.mutable_source(0);
	let activeHeading = $.mutable_source();

	$.legacy_pre_effect(() => ($.get(activeHeading)), () => {
		console.log($.get(activeHeading));
	});

	$.legacy_pre_effect_reset();

	var div = root();
	var div_1 = $.child(div);
	var button = $.child(div_1);
	let classes;
	var button_1 = $.sibling(button, 2);
	let classes_1;
	var button_2 = $.sibling(button_1, 2);
	let classes_2;

	$.reset(div_1);

	var div_2 = $.sibling(div_1, 2);
	var node = $.child(div_2);

	{
		var consequent = ($$anchor) => {
			var div_3 = root_1();
			var h1 = $.child(div_3);

			$.bind_this(h1, ($$value) => $.set(activeHeading, $$value), () => $.get(activeHeading));
			$.reset(div_3);
			$.append($$anchor, div_3);
		};

		$.if(node, ($$render) => {
			if ($.get(activeTab) === 0) $$render(consequent);
		});
	}

	var node_1 = $.sibling(node, 2);

	{
		var consequent_1 = ($$anchor) => {
			var div_4 = root_2();
			var h1_1 = $.child(div_4);

			$.bind_this(h1_1, ($$value) => $.set(activeHeading, $$value), () => $.get(activeHeading));
			$.reset(div_4);
			$.append($$anchor, div_4);
		};

		$.if(node_1, ($$render) => {
			if ($.get(activeTab) === 1) $$render(consequent_1);
		});
	}

	var node_2 = $.sibling(node_1, 2);

	{
		var consequent_2 = ($$anchor) => {
			var div_5 = root_3();
			var h1_2 = $.child(div_5);

			$.bind_this(h1_2, ($$value) => $.set(activeHeading, $$value), () => $.get(activeHeading));
			$.reset(div_5);
			$.append($$anchor, div_5);
		};

		$.if(node_2, ($$render) => {
			if ($.get(activeTab) === 2) $$render(consequent_2);
		});
	}

	$.reset(div_2);
	$.next(2);
	$.reset(div);

	$.template_effect(() => {
		classes = $.set_class(button, 1, '', null, classes, { active: $.get(activeTab) === 0 });
		classes_1 = $.set_class(button_1, 1, '', null, classes_1, { active: $.get(activeTab) === 1 });
		classes_2 = $.set_class(button_2, 1, '', null, classes_2, { active: $.get(activeTab) === 2 });
	});

	$.event('click', button, () => $.set(activeTab, 0));
	$.event('click', button_1, () => $.set(activeTab, 1));
	$.event('click', button_2, () => $.set(activeTab, 2));
	$.append($$anchor, div);
	$.pop();
}
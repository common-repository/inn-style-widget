<?php
/**
 * Plugin Name: Inn Style Widget
 * Description: Inn Style Widget for showing availabilities, calendar and bookables (rooms) on your hotel or B&B website
 * Version: 0.5
 * Author: Ian Tearle
 * Author URI: http://innstyle.co.uk
 */

add_action( 'widgets_init', 'innstyle_widget' );
add_action( 'init', 'cpts_register');
add_action( 'load-post.php', 'innstyle_meta_boxes_setup' );
add_action( 'edit_form_after_title', 'foo_move_deck');
add_action( 'admin_menu', 'innstyle_bookables' );
add_action( 'admin_head', 'cpt_icons' );


function innstyle_meta_boxes_setup() {
	/* Add meta boxes on the 'add_meta_boxes' hook. */
	add_action( 'add_meta_boxes', 'innstyle_add_post_meta_boxes' );
}

function innstyle_add_post_meta_boxes() {

	add_meta_box(
		'_innstyle_id',			// Unique ID
		esc_html__( 'Inn Style Room ID', 'innstyle_room_id' ),		// Title
		'innstyle_id_meta',		// Callback function
		'bookable',					// Admin page (or post type)
		'side',					// Context
		'default'					// Priority
	);

	add_meta_box(
		'_innstyle_type',			// Unique ID
		esc_html__( 'Inn Style Room Type', 'innstyle_room_type' ),		// Title
		'innstyle_type_meta',		// Callback function
		'bookable',					// Admin page (or post type)
		'side',					// Context
		'default'					// Priority
	);

	add_meta_box(
		'_innstyle_occupancy',			// Unique ID
		esc_html__( 'Inn Style Room Occupancy', 'innstyle_occupancy_type' ),		// Title
		'innstyle_occupancy_meta',		// Callback function
		'bookable',					// Admin page (or post type)
		'side',					// Context
		'default'					// Priority
	);
}

function innstyle_id_meta( $object, $box ) { ?>

	<?php wp_nonce_field( basename( __FILE__ ), 'innstyle_class_nonce' ); ?>

	<p>
		<label for="innstyle-id"><?php _e( "InnStyle room ID", 'innstyle_room_id' ); ?></label>
		<br />
		<input class="widefat" type="text" name="innstyle-id" id="innstyle-id" value="<?php echo esc_attr( get_post_meta( $object->ID, '_innstyle_id', true ) ); ?>" size="30" disabled />
	</p>
<?php
}

function innstyle_type_meta( $object, $box ) { ?>

	<?php wp_nonce_field( basename( __FILE__ ), 'innstyle_class_nonce' ); ?>

	<p>
		<label for="innstyle-type"><?php _e( "InnStyle room type", 'innstyle_room_type' ); ?></label>
		<br />
		<input class="widefat" type="text" name="innstyle-type" id="innstyle-type" value="<?php echo esc_attr( get_post_meta( $object->ID, '_innstyle_type', true ) ); ?>" size="30" disabled />
	</p>
<?php
}

function innstyle_occupancy_meta( $object, $box ) {
	wp_nonce_field( basename( __FILE__ ), 'innstyle_class_nonce' );

	$occupancy = (array) get_post_meta( $object->ID, '_innstyle_occupancy', true );
	foreach($occupancy as $k=>$v) {
		echo '<p>' . $k . ': ' . $v .'</p>';
	}
}



function fetch_media($file_url, $post_id) {
	require_once(ABSPATH . 'wp-load.php');
	require_once(ABSPATH . 'wp-admin/includes/image.php');
	global $wpdb;

	if(!$post_id) {
		return false;
	}

	//directory to import to
	$artDir = 'wp-content/uploads/importedmedia/';

	//if the directory doesn't exist, create it
	if(!file_exists(ABSPATH.$artDir)) {
		mkdir(ABSPATH.$artDir);
	}

	//rename the file... alternatively, you could explode on "/" and keep the original file name
	$ext = array_pop(explode(".", $file_url));
	$new_filename = 'blogmedia-'.$post_id.".".$ext; //if your post has multiple files, you may need to add a random number to the file name to prevent overwrites

	if (@fclose(@fopen($file_url, "r"))) { //make sure the file actually exists
		copy($file_url, ABSPATH.$artDir.$new_filename);

		$siteurl = get_option('siteurl');
		$file_info = getimagesize(ABSPATH.$artDir.$new_filename);

		//create an array of attachment data to insert into wp_posts table
		$artdata = array();
		$artdata = array(
			'post_author' => 1,
			'post_date' => current_time('mysql'),
			'post_date_gmt' => current_time('mysql'),
			'post_title' => $new_filename,
			'post_status' => 'inherit',
			'comment_status' => 'closed',
			'ping_status' => 'closed',
			'post_name' => sanitize_title_with_dashes(str_replace("_", "-", $new_filename)),
			'post_modified' => current_time('mysql'),
			'post_modified_gmt' => current_time('mysql'),
			'post_parent' => $post_id,
			'post_type' => 'attachment',
			'guid' => $siteurl.'/'.$artDir.$new_filename,
			'post_mime_type' => $file_info['mime'],
			'post_excerpt' => '',
			'post_content' => ''
		);

		$uploads = wp_upload_dir();
		$save_path = $uploads['basedir'].'/importedmedia/'.$new_filename;

		//insert the database record
		$attach_id = wp_insert_attachment( $artdata, $save_path, $post_id );

		//generate metadata and thumbnails
		if ($attach_data = wp_generate_attachment_metadata( $attach_id, $save_path)) {
			wp_update_attachment_metadata($attach_id, $attach_data);
		}

		//optional make it the featured image of the post it's attached to
		$rows_affected = $wpdb->insert($wpdb->prefix.'postmeta', array('post_id' => $post_id, 'meta_key' => '_thumbnail_id', 'meta_value' => $attach_id));
	}
	else {
		return false;
	}

	return true;
}

function innstyle_bookables() {
	add_management_page( 'Import InnStyle Bookables', 'InnStyle Import', 'manage_options', 'innstyle-bookables', 'innstyle_bookables_tools' );
}

function innstyle_bookables_tools() {
	if ( !current_user_can( 'manage_options' ) )  {
		wp_die( __( 'You do not have sufficient permissions to access this page.' ) );
	}

	global $wpdb;
	$options = get_option('widget_inn-style-widget');
	$options = reset($options);
	$domain = $options['domain'];

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, "https://innstyle.co.uk/api/v1/bookables.json?subdomain=".$domain);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    $output = curl_exec($ch);
    curl_close($ch);

	$api = json_decode($output);

	$images = $api->images;
	$bookables = $api->bookables;

    $hidden_field_name = 'innstyle_submit_hidden';

    // See if the user has posted us some information
    // If they did, this hidden field will be set to 'Y'
    if( isset($_POST[ $hidden_field_name ]) && $_POST[ $hidden_field_name ] == 'Y' ) {
    	$bookables_in_innstyle = $bookables;
    	$bookables_in_wordpress = get_posts(array('post_type'=>'bookable','posts_per_page'=>-1));

    	$wp_bookables = array();
	    foreach($bookables_in_wordpress as $biw) {
	    	$inn_style_id = get_post_meta($biw->ID,'_innstyle_id',true);
	    	$wp_bookables[$inn_style_id] = $biw->ID;
	    }

	    foreach($bookables_in_innstyle as $bookable) {
			// Check it's not already in WP.
			if(!array_key_exists($bookable->id, $wp_bookables)) {

				$post_id = wp_insert_post(array(
					'post_content'   => $bookable->description,
					'post_name'      => str_replace(' ','-',$bookable->name),
					'post_title'     => $bookable->name,
					'post_status'    => 'publish',
					'post_type'      => 'bookable',
					'menu_order'     => $bookable->position
				));

				if(!empty($bookable->image_ids)) {
					foreach($bookable->image_ids as $bookable_image_id) {
						foreach($images as $image) {
							if($image->id == $bookable_image_id) {
								fetch_media('http://' . $image->image_url, $post_id);
							}
						}
					}
				}

				add_post_meta($post_id, '_innstyle_id', $bookable->id, true);
				add_post_meta($post_id, '_innstyle_type', $bookable->type, true);
				add_post_meta($post_id, '_innstyle_occupancy', $bookable->occupancy, true);

				$updated = false;

			} else {
			// Update the existing WP posts with live content from InnStyle.
				wp_update_post(array(
					'ID'			 =>	$wp_bookables[$bookable->id],
					'post_content'   => $bookable->description,
					'post_name'      => str_replace(' ','-',$bookable->name),
					'post_title'     => $bookable->name,
					'post_status'    => 'publish',
					'post_type'      => 'bookable',
					'menu_order'     => $bookable->position
					)
				);

				update_post_meta($post_id, '_innstyle_id', $bookable->id, true);
				update_post_meta($post_id, '_innstyle_type', $bookable->type, true);
				update_post_meta($post_id, '_innstyle_occupancy', $bookable->occupancy, true);

				$updated = true;
			}
		}

		if($updated == true) {
			?>
			<div class="updated"><p><strong><?php _e('Bookables updated.', 'menu-test' ); ?></strong></p></div>
			<?php
		} else {
			?>
			<div class="updated"><p><strong><?php _e('Bookables imported.', 'menu-test' ); ?></strong></p></div>
			<?php
		}
    }
    echo '<div class="wrap">';
    echo "<h2>" . __( 'Import your InnStyle bookables', 'menu-test' ) . "</h2>";
	$count_posts = wp_count_posts( 'bookable' );

	if(!$count_posts->publish) {
		echo 'You have ' . count($bookables) . ' bookables ready to be imported.';
	} else {
		echo 'You have no new bookables to be imported';
	}
	wp_nonce_field( plugin_basename( __FILE__ ), 'myplugin_noncename' );
	?>
		<form name="form1" method="post" action="">
			<input type="hidden" name="<?php echo $hidden_field_name; ?>" value="Y">
			<hr />
			<p class="submit">
				<input type="submit" name="Submit" class="button-primary" value="<?php esc_attr_e('Import Bookables') ?>" />
			</p>

		</form>
	</div>

	<?php
}

/* Creating a Custom Post Type is blissfully simple ...
Simply add your Post Types to the $cpts array.
The first descriptor should be lowercase and plural
The second descriptor should be singular and title case
The third descriptor should be plural and title case    */

$cpts = array(
	$bookable = array('bookable','Bookable','Bookables','mask.png',array('title','editor','thumbnail')),
);

function codex_add_help_text( $contextual_help, $screen_id, $screen ) {
	//$contextual_help .= var_dump( $screen ); // use this to help determine $screen->id
	$admin_url = admin_url();
	if( 'bookable' == $screen->id ) {
		$contextual_help =
			'<p>' . __('Things to remember when editing this bookable:', 'your_text_domain') . '</p>' .
			'<ul>' .
				'<li>' . __('If you import your InnStyle bookables again, they will overwrite your changes.', 'your_text_domain') . '</li>' .
				'<li>' . __('Whatever you change here, will not be replicated on InnStyle.', 'your_text_domain') . '</li>' .
			'</ul>' .
			'<p>' . __('To ensure consistent data between InnStyle and your WordPress powered website:', 'your_text_domain') . '</p>' .
			'<ul>' .
				'<li>' . __('Make any changes to your bookables from within your InnStyle account.', 'your_text_domain') . '</li>' .
				'<li>' . __('Re-import your InnStyle bookables from the <a href="'.admin_url('tools.php?page=innstyle-bookables').'">InnStyle Import</a> tools menu.', 'your_text_domain') . '</li>' .
			'</ul>' .
			'<p><strong>' . __('For more information:', 'your_text_domain') . '</strong></p>' .
			'<p>' . __('<a href="http://developer.innstyle.co.uk" target="_blank">InnStyle Developer Documentation</a>', 'your_text_domain') . '</p>' .
			'<p>' . __('<a href="mailto:help@innstyle.co.uk" target="_blank">Email InnStyle Help</a>', 'your_text_domain') . '</p>';
	} elseif( 'edit-bookable' == $screen->id ) {
		$contextual_help =
			'<p>' . __('This is where your InnStyle bookables are managed within WordPress. You can import or update your bookables from the <a href="'.admin_url('tools.php?page=innstyle-bookables').'">InnStyle Import</a> tools menu.', 'your_text_domain') . '</p>' ;
	}
  return $contextual_help;
}
add_action( 'contextual_help', 'codex_add_help_text', 10, 3 );


function cpts_register() {

	global $cpts;

	foreach($cpts as $cpt) {

		$cpt_wp_name = $cpt[0];
		$cpt_singular = $cpt[1];
		$cpt_plural = $cpt[2];

		$labels = array(
			'name' => _x($cpt_plural, 'post type general name'),
			'singular_name' => _x($cpt_singular, 'post type singular name'),
			'add_new' => _x('Add New', $cpt_wp_name),
			'add_new_item' => __('Add New '.$cpt_singular),
			'edit_item' => __('Edit '.$cpt_singular),
			'new_item' => __('New '.$cpt_singular),
			'view_item' => __('View '.$cpt_singular),
			'search_items' => __('Search '.$cpt_plural),
			'not_found' =>  __('No '.$cpt_plural.' Found'),
			'not_found_in_trash' => __('No '.$cpt_plural.' Found in Trash'),
			'parent_item_colon' => ''
		);
		$args = array(
			'labels' => $labels,
			'public' => true,
			'show_ui' => true,
			'publicly_queryable' => true,
			'query_var' => true,
			'capability_type' => 'post',
			'hierarchical' => false,
			'rewrite' => true,
			'supports' => $cpt[4],
			'capabilities' => array(
				'create_posts' => false, // Removes support for the "Add New" function
			),
			'map_meta_cap' => true,
		);

		register_post_type($cpt_wp_name, $args );

	}

}

//create Products custom post type
function cpt_icons() {

	global $cpts;

	echo '<style type="text/css" media="screen">';

	foreach($cpts as $cpt){
	$cpt_wp_name = $cpt[0];
	$cpt_image = $cpt[3];
	  ?>
	  #menu-posts-<?php echo $cpt_wp_name ?> .wp-menu-image {
	  background: url(<?php bloginfo('template_url') ?>/images/cpt-icons/<?php echo $cpt_image ?>) no-repeat 6px -17px !important;
	  }
	#menu-posts-<?php echo $cpt_wp_name ?>:hover .wp-menu-image, #menu-posts-<?php echo $cpt_wp_name ?>.wp-has-current-submenu .wp-menu-image {
	  background-position:6px 7px!important;
	  }
	<?php
	}
	echo '</style>';

}

function foo_move_deck() {

    # Get the globals:
    global $post, $wp_meta_boxes;

    # Output the "advanced" meta boxes:
    do_meta_boxes(get_current_screen(), 'advanced', $post);

    # Remove the initial "advanced" meta boxes:
    unset($wp_meta_boxes['bookable']['advanced']);
}


function innstyle_widget() {
	register_widget( 'INNSTYLE_Widget' );
}

class INNSTYLE_Widget extends WP_Widget {

	/**
	 * Register widget with WordPress.
	 */
	function INNSTYLE_Widget() {
		$widget_ops = array( 'classname' => 'innstyle', 'description' => __('Display your availabilities on your site ', 'innstyle') );
		$this->WP_Widget( 'inn-style-widget', __('Inn Style Widget', 'innstyle'), $widget_ops );
		$this->pluginPath = WP_PLUGIN_DIR . '/' . basename(dirname(__FILE__));
		$this->pluginURL = WP_PLUGIN_URL . '/' . basename(dirname(__FILE__));
	}

	function jsonp_decode($jsonp, $assoc = false) { // PHP 5.3 adds depth as third parameter to json_decode
		if($jsonp[0] !== '[' && $jsonp[0] !== '{') { // we have JSONP
			$jsonp = substr($jsonp, strpos($jsonp, '('));
		}
		return json_decode(trim($jsonp,'();'), $assoc);
	}

	function widget_js($instance) {
		echo '<script type="text/javascript" src="'.$this->pluginURL . '/js/'.$instance['script'].'.js"></script>';
	}

	/**
	 * Front-end display of widget.
	 *
	 * @see WP_Widget::widget()
	 *
	 * @param array $args     Widget arguments.
	 * @param array $instance Saved values from database.
	 */
	function widget( $args, $instance ) {
		extract($args);

		add_action('wp_head', $this->widget_js($instance));

		//Our variables from the widget settings.
		$title = apply_filters('widget_title', $instance['title'] );
		$name = $instance['name'];
		$show_info = isset( $instance['show_info'] ) ? $instance['show_info'] : false;
		$domain = $instance['domain'];

		echo $before_widget;

		// Display the widget title
		if($title) {
			echo $before_title . $title . $after_title;
		}

		//Display the name
		if($name) {
			printf( '<p>' . __('Hey their Sailor! My name is %1$s.', 'innstyle') . '</p>', $name );
		}

		if($instance['script'] == 'availabilities') {
			$options = array(
				'branding' => ($instance['branding']) ? false : true,
				'custom' => ($instance['custom']) ? true : false,
				'height' => ($instance['height']) ? $instance['height'] : false
			);
		} elseif($instance['script'] == 'calendar') {
			$options = array(
				'color' => ($instance['color'] == true) ? 'light' : 'dark',
				'policy' => ($instance['policy']) ? $instance['policy'] : 'hide',
				'height' => ($instance['height']) ? $instance['height'] : false,
				'bookable' => ($instance['bookable']) ? $instance['bookable'] : null
			);
		} else {
			$options = array();
		}

		$options = ($options) ? ','.json_encode($options) : "";

		if($domain) {
			echo '<script>InnStyle("'.$domain.'"'.$options.');</script>';
		}

		if($show_info) {
			printf( $name );
		}


		echo $after_widget;
	}

	/**
	 * Back-end widget form.
	 *
	 * @see WP_Widget::form()
	 *
	 * @param array $instance Previously saved values from database.
	 */
	function form( $instance ) {

		//Set up some default widget settings.
		$defaults = array( 'title' => __('Demo', 'innstyle'), 'show_info' => true );
		$instance = wp_parse_args( (array) $instance, $defaults );

		// Widget Domain: Text Input.
		?>
		<p>
			<label for="<?php echo $this->get_field_id( 'domain' ); ?>"><?php _e('Domain (i.e. "thelodge"):', 'innstyle'); ?>
			<input class="widefat" id="<?php echo $this->get_field_id( 'domain' ); ?>" name="<?php echo $this->get_field_name( 'domain' ); ?>" type="text" value="<?php echo $instance['domain']; ?>" />
			</label>
		</p>
		<p>
			<label for="<?php echo $this->get_field_id( 'script' ); ?>"><?php _e('Which Inn Style integration widget?:', 'innstyle'); ?>
			<select id="<?php echo $this->get_field_id( 'script' ); ?>" name="<?php echo $this->get_field_name( 'script' ); ?>" class="widefat" style="width:100%;">
				<option <?php if ( 'availabilities' == $instance['script'] ) echo 'selected="selected"'; ?> value="availabilities">Availabilities</option>
				<option <?php if ( 'calendar' == $instance['script'] ) echo 'selected="selected"'; ?> value="calendar">Calendar</option>
			</select>
		</p>
		<?php
		// Height Text Input.
		?>
		<p>
			<label for="<?php echo $this->get_field_id( 'height' ); ?>"><?php _e('Rooms Display Height:', 'innstyle'); ?>
			<input class="widefat" id="<?php echo $this->get_field_id( 'height' ); ?>" name="<?php echo $this->get_field_name( 'height' ); ?>" type="text" value="<?php echo $instance['height']; ?>" />
			</label>
		</p>

		<p>
			<label for="<?php echo $this->get_field_id( 'width' ); ?>"><?php _e('Width:', 'innstyle'); ?>
			<input class="widefat" id="<?php echo $this->get_field_id( 'width' ); ?>" name="<?php echo $this->get_field_name( 'width' ); ?>" type="text" value="<?php echo $instance['width']; ?>" />
			</label>
		</p>

		<?php
		//Checkbox.
		?>
		<p>
			<input class="checkbox" type="checkbox" <?php if($instance['show_info']) echo 'checked="checked"'; ?> id="<?php echo $this->get_field_id( 'show_info' ); ?>" name="<?php echo $this->get_field_name( 'show_info' ); ?>" />
			<label for="<?php echo $this->get_field_id( 'show_info' ); ?>"><?php _e('Display info publicly?', 'innstyle'); ?></label>
		</p>
		<?php
		//Checkbox.
		?>
		<p>
			<input class="checkbox" type="checkbox" <?php if($instance['branding']) echo 'checked="checked"'; ?> id="<?php echo $this->get_field_id( 'branding' ); ?>" name="<?php echo $this->get_field_name( 'branding' ); ?>" />
			<label for="<?php echo $this->get_field_id( 'branding' ); ?>"><?php _e('Hide Inn Style logo?', 'innstyle'); ?></label>
		</p>
		<?php
		//Checkbox.
		?>
		<p>
			<input class="checkbox" type="checkbox" <?php if($instance['custom']) echo 'checked="checked"'; ?> id="<?php echo $this->get_field_id( 'custom' ); ?>" name="<?php echo $this->get_field_name( 'custom' ); ?>" />
			<label for="<?php echo $this->get_field_id('custom'); ?>"><?php _e('Use custom styles?', 'innstyle'); ?></label>
		</p>


		<p>
			<input class="checkbox" type="checkbox" <?php if($instance['color']) echo 'checked="checked"'; ?> id="<?php echo $this->get_field_id( 'color' ); ?>" name="<?php echo $this->get_field_name( 'color' ); ?>" />
			<label for="<?php echo $this->get_field_id('color'); ?>"><?php _e('Adjust color for dark backgrounds', 'innstyle'); ?></label>
		</p>

		<p>
			<label for="<?php echo $this->get_field_id( 'width' ); ?>"><?php _e('Policy visibility:', 'innstyle'); ?>
			<select id="<?php echo $this->get_field_id( 'policy' ); ?>" name="<?php echo $this->get_field_name( 'policy' ); ?>" class="widefat" style="width:100%;">
				<option <?php if ( 'hide' == $instance['policy'] ) echo 'selected="selected"'; ?> value="hide">Hidden</option>
				<option <?php if ( 'show' == $instance['policy'] ) echo 'selected="selected"'; ?> value="show">Shown</option>
			</select>
		</p>
	<?php
	}

	/**
	 * Sanitize widget form values as they are saved.
	 *
	 * @see WP_Widget::update()
	 *
	 * @param array $new_instance Values just sent to be saved.
	 * @param array $old_instance Previously saved values from database.
	 *
	 * @return array Updated safe values to be saved.
	 */
	function update( $new_instance, $old_instance ) {
		$instance = $old_instance;

		//Strip tags from title and name to remove HTML
		$instance['domain'] = strip_tags( $new_instance['domain'] );
		$instance['show_info'] = $new_instance['show_info'];
		$instance['branding'] = $new_instance['branding'];
		$instance['custom'] = $new_instance['custom'];
		$instance['height'] = strip_tags(trim($new_instance['height']));
		$instance['width'] = strip_tags(trim($new_instance['width']));
		$instance['color'] = $new_instance['color'];
		$instance['policy'] = strip_tags(trim($new_instance['policy']));
		$instance['script'] = strip_tags(trim($new_instance['script']));

		return $instance;
	}
}
